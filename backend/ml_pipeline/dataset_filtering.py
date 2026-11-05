"""
Dataset Filtering Module for VariantLens.
Filters ClinVar records for human GRCh38 missense single nucleotide variants (SNVs),
maps clinical significance categories, parses protein substitutions, and partitions
data into clean benchmark candidates vs exploratory datasets (VUS and conflicting records).
"""

import os
import re
import gzip
import json
import pandas as pd
from typing import Dict, Any, Tuple, Optional

# Standard 20 amino acids mapping (3-letter to 1-letter)
AA_3_TO_1 = {
    'Ala': 'A', 'Arg': 'R', 'Asn': 'N', 'Asp': 'D', 'Cys': 'C',
    'Gln': 'Q', 'Glu': 'E', 'Gly': 'G', 'His': 'H', 'Ile': 'I',
    'Leu': 'L', 'Lys': 'K', 'Met': 'M', 'Phe': 'F', 'Pro': 'P',
    'Ser': 'S', 'Thr': 'T', 'Trp': 'W', 'Tyr': 'Y', 'Val': 'V'
}

CLINVAR_STAR_MAP = {
    "practice guideline": 4,
    "reviewed by expert panel": 3,
    "criteria provided, multiple submitters, no conflicts": 2,
    "criteria provided, single submitter": 1,
    "criteria provided, conflicting classifications": 1,
    "no assertion criteria provided": 0,
    "no assertion provided": 0,
    "no classifications from unflagged records": 0
}

MISSENSE_REGEX_3 = re.compile(r"\(p\.([A-Z][a-z]{2})(\d+)([A-Z][a-z]{2})\)")
MISSENSE_REGEX_1 = re.compile(r"\(p\.([A-Z])(\d+)([A-Z])\)")

def parse_missense_change(name: str) -> Optional[Tuple[str, int, str, str, str]]:
    """
    Extracts wild-type AA, protein position, mutant AA from ClinVar Name string.
    Returns (wt_1, pos, mut_1, wt_3, mut_3) or None if not a standard missense variant.
    """
    if not name or "p." not in name:
        return None
    
    # Exclude frameshifts, indels, duplications, nonsense (Ter/*), synonymous
    if "fs" in name or "del" in name or "dup" in name or "ins" in name or "Ter" in name or "*" in name or "=" in name:
        return None

    # Three-letter code match
    m3 = MISSENSE_REGEX_3.search(name)
    if m3:
        wt_3, pos_str, mut_3 = m3.group(1), m3.group(2), m3.group(3)
        wt_1 = AA_3_TO_1.get(wt_3)
        mut_1 = AA_3_TO_1.get(mut_3)
        if wt_1 and mut_1 and wt_1 != mut_1:
            return wt_1, int(pos_str), mut_1, wt_3, mut_3

    # One-letter code match
    m1 = MISSENSE_REGEX_1.search(name)
    if m1:
        wt_1, pos_str, mut_1 = m1.group(1), m1.group(2), m1.group(3)
        if wt_1 in AA_3_TO_1.values() and mut_1 in AA_3_TO_1.values() and wt_1 != mut_1:
            return wt_1, int(pos_str), mut_1, wt_1, mut_1

    return None

def categorize_clinical_significance(clinsig: str) -> str:
    """
    Harmonizes ClinVar clinical significance into distinct scientific categories.
    """
    cs = clinsig.strip()
    cs_lower = cs.lower()

    if "conflicting" in cs_lower:
        return "Conflicting interpretations"
    elif "uncertain" in cs_lower or "vus" in cs_lower:
        return "Uncertain significance"
    elif "pathogenic/likely pathogenic" in cs_lower:
        return "Pathogenic/Likely pathogenic"
    elif cs_lower == "pathogenic":
        return "Pathogenic"
    elif cs_lower == "likely pathogenic":
        return "Likely pathogenic"
    elif "benign/likely benign" in cs_lower:
        return "Benign/Likely benign"
    elif cs_lower == "benign":
        return "Benign"
    elif cs_lower == "likely benign":
        return "Likely benign"
    elif any(kw in cs_lower for kw in ["drug response", "risk factor", "association", "protective", "affects", "other", "not provided"]):
        return "Other/Unclassified"
    else:
        return "Other/Unclassified"

def filter_clinvar_records(
    raw_gz_path: str,
    output_dir: str
) -> Dict[str, Any]:
    os.makedirs(output_dir, exist_ok=True)
    filtered_missense_path = os.path.join(output_dir, "clinvar_missense_filtered.parquet")
    exploratory_path = os.path.join(output_dir, "clinvar_exploratory_vus_conflicting.parquet")
    filtering_stats_path = os.path.join(output_dir, "filtering_stats.json")

    print(f"[*] Beginning streaming filter on: {raw_gz_path}")

    total_downloaded_records = 0
    total_human_grch38_records = 0
    total_missense_snvs = 0

    filtered_rows = []
    exploratory_rows = []

    with gzip.open(raw_gz_path, "rt", encoding="utf-8", errors="replace") as f:
        header_line = f.readline()
        headers = header_line.strip().split("\t")
        col_indices = {col: i for i, col in enumerate(headers)}

        # Required indices
        idx_assembly = col_indices.get("Assembly")
        idx_type = col_indices.get("Type")
        idx_name = col_indices.get("Name")
        idx_gene = col_indices.get("GeneSymbol")
        idx_gene_id = col_indices.get("GeneID")
        idx_hgnc = col_indices.get("HGNC_ID")
        idx_clinsig = col_indices.get("ClinicalSignificance")
        idx_eval = col_indices.get("LastEvaluated")
        idx_rs = col_indices.get("RS# (dbSNP)")
        idx_chrom = col_indices.get("Chromosome")
        idx_start = col_indices.get("Start")
        idx_stop = col_indices.get("Stop")
        idx_ref = col_indices.get("ReferenceAllele")
        idx_alt = col_indices.get("AlternateAllele")
        idx_review = col_indices.get("ReviewStatus")
        idx_num_sub = col_indices.get("NumberSubmitters")
        idx_var_id = col_indices.get("VariationID")
        idx_pheno = col_indices.get("PhenotypeList")
        idx_pos_vcf = col_indices.get("PositionVCF")
        idx_ref_vcf = col_indices.get("ReferenceAlleleVCF")
        idx_alt_vcf = col_indices.get("AlternateAlleleVCF")

        line_num = 0
        for line in f:
            line_num += 1
            total_downloaded_records += 1

            if line_num % 500000 == 0:
                print(f"    ... processed {line_num:,} records | GRCh38: {total_human_grch38_records:,} | Missense SNVs: {total_missense_snvs:,}")

            fields = line.strip().split("\t")
            if len(fields) <= max(idx_assembly, idx_type, idx_name, idx_clinsig):
                continue

            assembly = fields[idx_assembly]
            if assembly != "GRCh38":
                continue

            total_human_grch38_records += 1

            var_type = fields[idx_type]
            if var_type != "single nucleotide variant":
                continue

            name = fields[idx_name]
            missense_info = parse_missense_change(name)
            if not missense_info:
                continue

            total_missense_snvs += 1
            wt_1, pos, mut_1, wt_3, mut_3 = missense_info

            raw_clinsig = fields[idx_clinsig]
            category = categorize_clinical_significance(raw_clinsig)
            review_status = fields[idx_review] if idx_review < len(fields) else ""
            review_stars = CLINVAR_STAR_MAP.get(review_status.lower(), 0)
            
            num_sub_str = fields[idx_num_sub] if idx_num_sub < len(fields) else "0"
            try:
                num_submitters = int(num_sub_str) if num_sub_str != "-" else 0
            except ValueError:
                num_submitters = 0

            chrom = fields[idx_chrom] if idx_chrom < len(fields) else ""
            start = fields[idx_start] if idx_start < len(fields) else ""
            stop = fields[idx_stop] if idx_stop < len(fields) else ""
            ref = fields[idx_ref] if idx_ref < len(fields) else ""
            alt = fields[idx_alt] if idx_alt < len(fields) else ""
            pos_vcf = fields[idx_pos_vcf] if idx_pos_vcf < len(fields) else start
            ref_vcf = fields[idx_ref_vcf] if idx_ref_vcf < len(fields) else ref
            alt_vcf = fields[idx_alt_vcf] if idx_alt_vcf < len(fields) else alt

            # Clean alleles from VCF when available
            ref_final = ref_vcf if ref_vcf and ref_vcf != "na" and ref_vcf != "-" else ref
            alt_final = alt_vcf if alt_vcf and alt_vcf != "na" and alt_vcf != "-" else alt
            pos_final = pos_vcf if pos_vcf and pos_vcf != "-1" and pos_vcf != "-" else start

            record = {
                "variation_id": fields[idx_var_id] if idx_var_id < len(fields) else "",
                "gene_symbol": fields[idx_gene] if idx_gene < len(fields) else "",
                "gene_id": fields[idx_gene_id] if idx_gene_id < len(fields) else "",
                "hgnc_id": fields[idx_hgnc] if idx_hgnc < len(fields) else "",
                "name": name,
                "protein_change": f"p.{wt_3}{pos}{mut_3}",
                "wild_type_aa": wt_1,
                "mutant_aa": mut_1,
                "protein_position": pos,
                "clinical_significance_raw": raw_clinsig,
                "clinical_category": category,
                "review_status": review_status,
                "review_stars": review_stars,
                "number_submitters": num_submitters,
                "last_evaluated": fields[idx_eval] if idx_eval < len(fields) else "",
                "rs_id": fields[idx_rs] if idx_rs < len(fields) else "",
                "chromosome": chrom,
                "start": pos_final,
                "reference_allele": ref_final,
                "alternate_allele": alt_final,
                "phenotypes": fields[idx_pheno] if idx_pheno < len(fields) else ""
            }

            # Partition into clean benchmark vs exploratory
            if category in ["Pathogenic", "Likely pathogenic", "Pathogenic/Likely pathogenic", "Benign", "Likely benign", "Benign/Likely benign"]:
                filtered_rows.append(record)
            else:
                exploratory_rows.append(record)

    print(f"[+] Filtering complete. Total records scanned: {total_downloaded_records:,}")
    print(f"    - Human GRCh38 records: {total_human_grch38_records:,}")
    print(f"    - Missense SNVs identified: {total_missense_snvs:,}")
    print(f"    - Benchmark Candidates (Pathogenic / Benign / Likely): {len(filtered_rows):,}")
    print(f"    - Exploratory Candidates (VUS / Conflicting / Other): {len(exploratory_rows):,}")

    df_filtered = pd.DataFrame(filtered_rows)
    df_exploratory = pd.DataFrame(exploratory_rows)

    df_filtered.to_parquet(filtered_missense_path, index=False)
    df_exploratory.to_parquet(exploratory_path, index=False)

    stats = {
        "total_downloaded_records": total_downloaded_records,
        "total_human_grch38_records": total_human_grch38_records,
        "total_missense_snvs": total_missense_snvs,
        "benchmark_candidates_count": len(filtered_rows),
        "exploratory_candidates_count": len(exploratory_rows),
        "filtered_missense_path": os.path.abspath(filtered_missense_path),
        "exploratory_path": os.path.abspath(exploratory_path)
    }

    with open(filtering_stats_path, "w") as f:
        json.dump(stats, f, indent=2)

    return stats
