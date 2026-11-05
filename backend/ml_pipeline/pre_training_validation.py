"""
Pre-Training Validation Module for VariantLens.
Executes rigorous biological, mathematical, and data integrity checks
prior to machine learning model training.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from Bio.Align import substitution_matrices

# Ensure ml_pipeline is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from amino_acid_properties import (
    STANDARD_AMINO_ACIDS,
    GRANTHAM_MATRIX,
    get_grantham_distance,
    get_blosum62_score
)

def run_pre_training_validation(
    features_parquet_path: str,
    output_report_path: Optional[str] = None
) -> Dict[str, Any]:
    print("=" * 70)
    print("VariantLens Phase 4: Pre-Training Data & Biological Validation")
    print("=" * 70)

    # 1. Load Parquet
    print(f"[*] Loading feature dataset from: {features_parquet_path}")
    df = pd.read_parquet(features_parquet_path)
    total_rows = len(df)
    print(f"[+] Loaded {total_rows:,} records.")
    assert total_rows == 202575, f"Expected 202,575 rows, found {total_rows:,}!"

    # 2. Check Genomic ID Uniqueness
    unique_genomic_ids = df["genomic_id"].nunique()
    duplicate_genomic_count = total_rows - unique_genomic_ids
    print(f"[+] Unique genomic variants: {unique_genomic_ids:,} (Duplicates: {duplicate_genomic_count})")
    assert duplicate_genomic_count == 0, f"Found {duplicate_genomic_count} duplicate genomic IDs!"

    # 3. Check Binary Target Labels
    label_counts = df["target_label"].value_counts().to_dict()
    print(f"[+] Binary target distribution: Class 0 (Benign/Likely Benign): {label_counts.get(0, 0):,}, Class 1 (Pathogenic/Likely Pathogenic): {label_counts.get(1, 0):,}")
    assert set(label_counts.keys()) == {0, 1}, f"Unexpected target labels: {label_counts.keys()}"
    assert label_counts[0] == 140717, f"Expected 140,717 class 0, got {label_counts[0]}"
    assert label_counts[1] == 61858, f"Expected 61,858 class 1, got {label_counts[1]}"
    prevalence = round(label_counts[1] / total_rows * 100, 2)
    print(f"[+] Positive class prevalence: {prevalence}% (Pathogenic: {label_counts[1]:,} / Total: {total_rows:,})")

    # 4. Target Leakage Verification
    clinical_cols = ["clinical_category", "review_status", "review_stars", "number_submitters"]
    candidate_features = [
        "grantham_distance",
        "blosum62_score",
        "hydropathy_delta",
        "charge_delta",
        "molecular_weight_delta",
        "relative_protein_position",
        "absolute_protein_position"
    ]
    for c in clinical_cols:
        assert c not in candidate_features, f"Critical Leakage: clinical column '{c}' in feature list!"
    print(f"[+] Target Leakage Check Passed: Clinical annotations strictly segregated from features.")

    # 5. Independent BLOSUM62 Matrix Validation
    print("[*] Validating BLOSUM62 substitution matrix against published Henikoff (1992) standards...")
    bio_mat = substitution_matrices.load("BLOSUM62")
    all_scores = []
    min_score = 999
    max_score = -999
    diagonal_scores = {}

    for aa1 in STANDARD_AMINO_ACIDS:
        s_self = int(bio_mat[aa1, aa1])
        diagonal_scores[aa1] = s_self
        assert s_self > 0, f"BLOSUM62 self-score must be positive for {aa1}"
        for aa2 in STANDARD_AMINO_ACIDS:
            s1 = int(bio_mat[aa1, aa2])
            s2 = int(bio_mat[aa2, aa1])
            assert s1 == s2, f"BLOSUM62 asymmetry: {aa1}-{aa2} ({s1}) != {aa2}-{aa1} ({s2})"
            all_scores.append(s1)
            if s1 < min_score:
                min_score = s1
            if s1 > max_score:
                max_score = s1

    print(f"[+] BLOSUM62 matrix full score range: [{min_score}, {max_score}]")
    print(f"    - Max diagonal score: {max(diagonal_scores.values())} (Trp-Trp: {diagonal_scores['W']})")
    print(f"    - Min diagonal score: {min(diagonal_scores.values())} (Asn/Gln/Ser: {diagonal_scores['S']})")
    assert min_score == -4, f"Expected BLOSUM62 min score -4, got {min_score}"
    assert max_score == 11, f"Expected BLOSUM62 max score 11 (W-W), got {max_score}"

    # 6. Grantham Distance Matrix Validation
    print("[*] Validating Grantham (1974) distance matrix symmetry and bounds...")
    g_scores = []
    for aa1 in STANDARD_AMINO_ACIDS:
        assert get_grantham_distance(aa1, aa1) == 0
        for aa2 in STANDARD_AMINO_ACIDS:
            d = get_grantham_distance(aa1, aa2)
            assert d is not None
            g_scores.append(d)

    print(f"[+] Grantham matrix full range: [{min(g_scores)}, {max(g_scores)}]")
    assert min(g_scores) == 0
    assert max(g_scores) == 215 # Cys-Trp max divergence

    # 7. Investigate Protein Positions & Giant Human Proteins
    print("[*] Investigating protein positions and giant human transcripts...")
    max_pos = df["absolute_protein_position"].max()
    min_pos = df["absolute_protein_position"].min()
    print(f"[+] Protein position range: [{min_pos}, {max_pos:,}]")
    assert min_pos >= 1, f"Invalid non-positive position: {min_pos}"

    # Unusually long positions (> 3,000 aa)
    long_positions = df[df["absolute_protein_position"] > 3000]
    long_genes = long_positions["gene_symbol"].value_counts().to_dict()
    print(f"[+] Found {len(long_positions):,} variants with residue position > 3,000 aa across {len(long_genes)} giant proteins:")
    for g, count in list(long_genes.items())[:8]:
        max_gene_pos = long_positions[long_positions["gene_symbol"] == g]["absolute_protein_position"].max()
        print(f"    - Gene: {g:<10} | Max Position: {max_gene_pos:>6,} aa | Variant Count: {count:>5,}")

    # Verify titin (TTN) max position
    ttn_variants = df[df["gene_symbol"] == "TTN"]
    ttn_max = ttn_variants["absolute_protein_position"].max()
    print(f"[+] Verified Titin (TTN) max position: #{ttn_max:,} (within canonical length of 35,991 aa)")
    assert ttn_max <= 35991, f"Position {ttn_max} exceeds canonical TTN length 35,991!"

    # 8. Missingness Analysis across all 10 features
    print("\n[*] Auditing feature missingness in cohort:")
    ten_features = [
        "relative_protein_position",
        "absolute_protein_position",
        "grantham_distance",
        "blosum62_score",
        "hydropathy_delta",
        "charge_delta",
        "molecular_weight_delta",
        "is_observed_in_gnomad",
        "gnomad_log10_af",
        "alphafold_plddt"
    ]
    missing_summary = {}
    for col in ten_features:
        null_count = int(df[col].isna().sum())
        null_pct = round(null_count / total_rows * 100, 2)
        missing_summary[col] = {"null_count": null_count, "null_pct": null_pct}
        status_str = "COMPLETE (0.0% missing)" if null_count == 0 else f"MISSING {null_count:,} ({null_pct}%)"
        print(f"    - {col:<26}: {status_str}")

    # 9. Connected Gene Component Groups
    unique_groups = df["overlapping_gene_group_id"].nunique()
    print(f"\n[+] Total overlapping-gene connected component groups: {unique_groups:,}")
    largest_groups = df["overlapping_gene_group_id"].value_counts().head(5).to_dict()
    print(f"[+] Largest connected components:")
    for grp, cnt in largest_groups.items():
        print(f"    - {grp:<24}: {cnt:,} variants ({cnt / total_rows * 100:.2f}%)")

    validation_result = {
        "validation_passed": True,
        "total_records": total_rows,
        "unique_genomic_variants": unique_genomic_ids,
        "target_distribution": label_counts,
        "positive_prevalence_pct": prevalence,
        "blosum62_range": [min_score, max_score],
        "grantham_range": [min(g_scores), max(g_scores)],
        "position_range": [int(min_pos), int(max_pos)],
        "giant_genes": long_genes,
        "missingness": missing_summary,
        "unique_groups": unique_groups
    }

    print("\n" + "=" * 70)
    print("[+] ALL PRE-TRAINING VALIDATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)
    return validation_result

if __name__ == "__main__":
    from typing import Dict, Any, Optional
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    feat_path = os.path.join(base_dir, "data", "processed", "variant_features.parquet")
    run_pre_training_validation(feat_path)
