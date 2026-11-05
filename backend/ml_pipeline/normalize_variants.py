"""
Variant Normalization & Deduplication Module for VariantLens.
Harmonizes genomic coordinates (GRCh38), resolves multiple submissions per genomic locus,
prevents equivalent variant representations from leaking, and generates unique variant identities.
"""

import os
import json
import pandas as pd
from typing import Dict, Any, Tuple

def normalize_and_deduplicate(
    filtered_parquet_path: str,
    exploratory_parquet_path: str,
    output_dir: str
) -> Dict[str, Any]:
    os.makedirs(output_dir, exist_ok=True)
    dedup_benchmark_path = os.path.join(output_dir, "clinvar_benchmark_deduplicated.parquet")
    dedup_exploratory_path = os.path.join(output_dir, "clinvar_exploratory_deduplicated.parquet")
    dedup_stats_path = os.path.join(output_dir, "deduplication_stats.json")

    print(f"[*] Loading filtered benchmark records from: {filtered_parquet_path}")
    df_bm = pd.read_parquet(filtered_parquet_path)
    print(f"[*] Loading exploratory records from: {exploratory_parquet_path}")
    df_exp = pd.read_parquet(exploratory_parquet_path)

    initial_bm_count = len(df_bm)
    initial_exp_count = len(df_exp)

    # Construct canonical genomic coordinate key: chr:pos:ref:alt
    # Clean chromosome string (strip 'chr' if present, handle X, Y, MT)
    def clean_chrom(c):
        c_str = str(c).strip()
        if c_str.lower().startswith("chr"):
            c_str = c_str[3:]
        return c_str.upper()

    df_bm["chrom_clean"] = df_bm["chromosome"].apply(clean_chrom)
    df_exp["chrom_clean"] = df_exp["chromosome"].apply(clean_chrom)

    # Filter out records missing valid genomic start or alleles
    df_bm_valid = df_bm[
        (df_bm["start"].str.strip() != "") &
        (df_bm["start"].str.strip() != "-1") &
        (df_bm["reference_allele"].str.strip() != "") &
        (df_bm["reference_allele"].str.strip() != "na") &
        (df_bm["alternate_allele"].str.strip() != "") &
        (df_bm["alternate_allele"].str.strip() != "na")
    ].copy()

    df_exp_valid = df_exp[
        (df_exp["start"].str.strip() != "") &
        (df_exp["start"].str.strip() != "-1") &
        (df_exp["reference_allele"].str.strip() != "") &
        (df_exp["reference_allele"].str.strip() != "na") &
        (df_exp["alternate_allele"].str.strip() != "") &
        (df_exp["alternate_allele"].str.strip() != "na")
    ].copy()

    df_bm_valid["genomic_id"] = (
        "chr" + df_bm_valid["chrom_clean"] + ":" +
        df_bm_valid["start"].astype(str) + ":" +
        df_bm_valid["reference_allele"].str.upper() + ">" +
        df_bm_valid["alternate_allele"].str.upper()
    )

    df_exp_valid["genomic_id"] = (
        "chr" + df_exp_valid["chrom_clean"] + ":" +
        df_exp_valid["start"].astype(str) + ":" +
        df_exp_valid["reference_allele"].str.upper() + ">" +
        df_exp_valid["alternate_allele"].str.upper()
    )

    # Investigate duplicate submissions in benchmark data
    duplicate_genomic_mask = df_bm_valid.duplicated(subset=["genomic_id"], keep=False)
    num_duplicate_rows = duplicate_genomic_mask.sum()
    print(f"[*] Found {num_duplicate_rows:,} duplicate submissions sharing genomic coordinates in benchmark set.")

    # Deduplication strategy:
    # Sort by: review_stars (descending), number_submitters (descending), variation_id
    df_bm_sorted = df_bm_valid.sort_values(
        by=["review_stars", "number_submitters", "variation_id"],
        ascending=[False, False, True]
    )

    # Detect if any genomic duplicate has conflicting clinical classifications within benchmark set
    # (e.g. one submitter says Pathogenic, another says Benign at identical coordinate)
    grouped = df_bm_sorted.groupby("genomic_id")["clinical_category"].nunique()
    conflicting_genomic_ids = set(grouped[grouped > 1].index)
    print(f"[*] Found {len(conflicting_genomic_ids):,} genomic loci with conflicting classifications across duplicate submissions.")

    # Reclassify conflicting duplicates into exploratory partition
    is_conflicting = df_bm_sorted["genomic_id"].isin(conflicting_genomic_ids)
    reclassified_conflicts = df_bm_sorted[is_conflicting].copy()
    reclassified_conflicts["clinical_category"] = "Conflicting interpretations"
    reclassified_conflicts["review_status"] = "criteria provided, conflicting classifications"

    # Retain non-conflicting benchmark variants, keeping the single highest-confidence entry
    df_bm_clean = df_bm_sorted[~is_conflicting].drop_duplicates(subset=["genomic_id"], keep="first").copy()

    # Append conflicts to exploratory dataset and deduplicate exploratory
    df_exp_combined = pd.concat([df_exp_valid, reclassified_conflicts], ignore_index=True)
    df_exp_sorted = df_exp_combined.sort_values(
        by=["review_stars", "number_submitters", "variation_id"],
        ascending=[False, False, True]
    )
    df_exp_clean = df_exp_sorted.drop_duplicates(subset=["genomic_id"], keep="first").copy()

    # Further verify protein-level deduplication:
    # A single gene + amino acid change (e.g. BRAF V600E) may arise from different nucleotide changes.
    # We record codon nucleotide identity while preserving genomic coordinates.
    df_bm_clean["protein_variant_id"] = (
        df_bm_clean["gene_symbol"] + "_" + df_bm_clean["protein_change"]
    )

    print(f"[+] Deduplication complete:")
    print(f"    - Raw benchmark rows: {initial_bm_count:,}")
    print(f"    - Unique normalized genomic variants in benchmark: {len(df_bm_clean):,}")
    print(f"    - Unique genes in benchmark: {df_bm_clean['gene_symbol'].nunique():,}")
    print(f"    - Unique normalized genomic variants in exploratory: {len(df_exp_clean):,}")
    print(f"    - Unique genes in exploratory: {df_exp_clean['gene_symbol'].nunique():,}")

    df_bm_clean.to_parquet(dedup_benchmark_path, index=False)
    df_exp_clean.to_parquet(dedup_exploratory_path, index=False)

    stats = {
        "initial_benchmark_records": initial_bm_count,
        "valid_coordinates_benchmark": len(df_bm_valid),
        "duplicate_genomic_rows_found": int(num_duplicate_rows),
        "conflicting_genomic_loci_reclassified": len(conflicting_genomic_ids),
        "final_unique_benchmark_variants": len(df_bm_clean),
        "final_unique_benchmark_genes": int(df_bm_clean["gene_symbol"].nunique()),
        "final_unique_exploratory_variants": len(df_exp_clean),
        "final_unique_exploratory_genes": int(df_exp_clean["gene_symbol"].nunique()),
        "deduplicated_benchmark_path": os.path.abspath(dedup_benchmark_path),
        "deduplicated_exploratory_path": os.path.abspath(dedup_exploratory_path)
    }

    with open(dedup_stats_path, "w") as f:
        json.dump(stats, f, indent=2)

    return stats
