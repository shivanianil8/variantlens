"""
Master Pipeline Runner for ClinVar Data Acquisition, Filtering, Normalization & Audit.
Executes Phase 2 sequentially without training any ML models.
"""

import os
import sys
import time

# Ensure ml_pipeline is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_acquisition import download_clinvar_summary
from dataset_filtering import filter_clinvar_records
from normalize_variants import normalize_and_deduplicate
from dataset_audit import run_dataset_audit

def main():
    print("=" * 70)
    print("VariantLens Phase 2: ClinVar Data Acquisition & Dataset Audit")
    print("=" * 70)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_dir = os.path.join(base_dir, "data", "raw")
    processed_dir = os.path.join(base_dir, "data", "processed")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(processed_dir, exist_ok=True)

    raw_gz_path = os.path.join(raw_dir, "variant_summary.txt.gz")
    metadata_json_path = os.path.join(raw_dir, "clinvar_metadata.json")

    start_total = time.time()

    # Step 1: Data Acquisition
    print("\n>>> STEP 1: Acquiring Real NCBI ClinVar Release...")
    meta = download_clinvar_summary(output_dir=raw_dir)
    print(f"[+] Download metadata recorded: {metadata_json_path}")

    # Step 2: Filtering GRCh38 Human Missense SNVs
    print("\n>>> STEP 2: Filtering GRCh38 Human Missense SNVs...")
    filter_stats = filter_clinvar_records(raw_gz_path=raw_gz_path, output_dir=processed_dir)

    # Step 3: Normalization & Deduplication
    print("\n>>> STEP 3: Normalizing Coordinates & Deduplicating Equivalent Entries...")
    filtered_parquet = filter_stats["filtered_missense_path"]
    exploratory_parquet = filter_stats["exploratory_path"]
    dedup_stats = normalize_and_deduplicate(
        filtered_parquet_path=filtered_parquet,
        exploratory_parquet_path=exploratory_parquet,
        output_dir=processed_dir
    )

    # Step 4: Comprehensive Biological Audit
    print("\n>>> STEP 4: Running Comprehensive Dataset Audit & Generating Charts...")
    audit_summary = run_dataset_audit(
        benchmark_parquet_path=dedup_stats["deduplicated_benchmark_path"],
        exploratory_parquet_path=dedup_stats["deduplicated_exploratory_path"],
        metadata_json_path=metadata_json_path,
        output_dir=processed_dir
    )

    total_time = time.time() - start_total
    print("\n" + "=" * 70)
    print(f"[+] Phase 2 Complete in {total_time:.1f} seconds!")
    print(f"[+] Audit Report: {audit_summary['report_markdown_path']}")
    print(f"[+] Visualizations: {audit_summary['visualizations_dir']}")
    print("=" * 70)

if __name__ == "__main__":
    main()
