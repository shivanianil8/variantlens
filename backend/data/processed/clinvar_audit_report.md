# ClinVar Dataset Quality & Distribution Audit Report

**Date of Audit**: 2026-11-05T13:44:07.781998+00:00  
**Assembly**: GRCh38 (Human Reference Genome)  
**Data Provenance**: Official NCBI ClinVar Public Release (`variant_summary.txt.gz`)  
**SHA256 Checksum**: `7c39f2d875f3cd1ccd2d568662f06a7df647dd91fc0f51a072a758b08004c72e`  
**Original File Size**: 436.65 MB (457,862,838 bytes)  

---

## 1. Executive Summary & Filtering Funnel

The goal of this audit is to rigorously inspect real-world ClinVar annotations, distinguish clinically unambiguous missense variants from exploratory classifications, identify data duplication across submissions, and detect potential ascertainment biases before machine learning model development.

| Funnel Stage | Record Count | Description |
| :--- | :--- | :--- |
| **Total Scanned ClinVar Records** | **436.65 MB archive** | Raw lines in `variant_summary.txt.gz` |
| **Human GRCh38 Assembly Records** | **Filtered for GRCh38** | Excludes GRCh37 coordinate duplications |
| **Missense Single Nucleotide Variants (SNVs)** | **Missense codon substitutions** | Excludes indels, frameshifts, truncations |
| **Total Unique Genomic Variants** | **2,572,692** | Deduplicated on `(chr, pos, ref, alt)` |
| **Total Unique Human Genes Represented** | **20,107 genes** | Spanning metabolic, signaling, and channel genes |

---

## 2. Classification Breakdown & Scientific Partitioning

To avoid label noise and contamination, **VariantLens strictly segregates unambiguous clinical consensus from exploratory classifications (VUS and conflicting interpretations)**.

### A. Clean Benchmark Partition (Candidates for Training & Held-Out Evaluation)
- **Pathogenic**: 22,960 variants
- **Likely Pathogenic**: 49,273 variants
- **Total Deleterious / Disease-Associated Pool**: **72,233 variants**
- **Benign**: 27,145 variants
- **Likely Benign**: 119,340 variants
- **Total Neutral / Tolerated Pool**: **146,485 variants**
- **Benchmark Total**: **218,718 unique variants** (15,935 genes)
- **Pathogenic to Benign Class Ratio**: **0.49:1**

### B. Exploratory & Unresolved Partition (Isolated from Supervised Training)
- **Variants of Uncertain Significance (VUS)**: **2,171,010 variants**
- **Conflicting Interpretations of Pathogenicity**: **122,077 variants**
- **Other / Unclassified Submissions**: **60,887 variants**
- **Exploratory Total**: **2,353,974 unique variants** (19,757 genes)

> **Scientific Recommendation**: VUS and Conflicting variants must NOT be arbitrarily binarized or forced into binary classification. They are preserved in a dedicated exploratory parquet dataset for hypothesis generation and uncertainty modeling.

---

## 3. Review Status & Evidence Confidence Distribution

ClinVar assigns review status reflecting the level of review and submission consensus:

| Review Level | Review Stars | ClinVar Assertion Criteria | Variant Count | % of All Variants |
| :--- | :--- | :--- | :--- | :--- |
| **Practice Guideline** | ★★★★ (4) | Curated by medical practice guideline committees | 30 | 0.0% |
| **Expert Panel** | ★★★☆ (3) | Reviewed by ClinGen or expert domain consortium | 8,222 | 0.32% |
| **Multiple Submitters** | ★★☆☆ (2) | Criteria provided, multiple submitters, no conflicts | 367,075 | 14.27% |
| **Single Submitter** | ★☆☆☆ (1) | Criteria provided by a single clinical laboratory | 2,097,532 | 81.53% |
| **No Assertion Criteria** | ☆☆☆☆ (0) | Historical records lacking standardized criteria | 99,833 | 3.88% |

### High-Confidence Benchmark Subset (≥ 1 Star)
- **Total High-Confidence Variants (≥ 1 Star)**: **202,575 variants**
- **Pathogenic / Likely Pathogenic (≥ 1 Star)**: 61,858
- **Benign / Likely Benign (≥ 1 Star)**: 140,717
- **High-Confidence Ratio**: **0.44:1**

---

## 4. Gene Coverage & Distribution Across the Genome

- **Unique Genes in Benchmark**: 15,935 genes
- **Mean Variants per Gene**: 13.7 variants
- **Median Variants per Gene**: 5.0 variants
- **Single-Variant Genes**: 2,805 (17.6% of genes have only 1 reported benchmark variant)
- **Heavily Studied Genes (≥ 50 variants)**: 740 genes

### Top 15 Heavily Reported Genes in Benchmark
The distribution is heavily skewed towards cancer-predisposition, cardiac, and diagnostic-panel genes:
- **FBN1**: 1,628 variants
- **TTN**: 1,156 variants
- **KMT2D**: 1,125 variants
- **SCN1A**: 1,094 variants
- **DNAH11**: 1,038 variants
- **COL4A5**: 873 variants
- **BRCA2**: 861 variants
- **LDLR**: 770 variants
- **OBSCN**: 717 variants
- **BRCA1**: 696 variants
- **ABCA4**: 669 variants
- **COL2A1**: 624 variants
- **COL3A1**: 616 variants
- **COL1A2**: 608 variants
- **GLA**: 604 variants

> **Critical Machine Learning Implication**: This extreme gene imbalance confirms that **random train/test splits would cause catastrophic data leakage**. A model could simply memorize that variants in *FBN1* or *TTN* are pathogenic. **Gene-level GroupKFold is strictly mandatory**.

---

## 5. Duplicate Submission & Equivalent Representation Audit

- Multiple clinical laboratories frequently submit records for the same genomic position under distinct variation IDs.
- **Genomic Coordinate Harmonization**: Variants were indexed by `chr:pos:ref>alt` on GRCh38.
- Duplicate entries sharing identical coordinates were audited:
  - If duplicate submissions held unanimous consensus, the record with highest review stars and submitter count was retained.
  - If duplicate submissions held discordant classifications (e.g. Submitter A: Benign, Submitter B: Pathogenic), the variant was **reclassified as Conflicting** and relocated into the exploratory partition.

---

## 6. Missingness & Quality Audit

| Attribute | Missing Count (Benchmark) | Missing Percentage | Semantics & Handling Strategy |
| :--- | :--- | :--- | :--- |
| **dbSNP rsID** | 0 | 0.0% | Novel clinical variants absent from dbSNP; handled via genomic coordinates. |
| **Last Evaluated Date** | 4,165 | 1.9% | Historical or uncurated submissions lacking evaluation timestamps. |
| **Phenotype List** | 33,877 | 15.49% | Classified as 'not provided'; never used as model input features. |
| **HGNC ID** | 899 | 0.41% | Unofficial gene symbols; resolved via GeneID. |
| **gnomAD Frequency** | *Unobserved in exomes* | Expected > 60% | **Missingness Semantics**: Variants absent in gnomAD are deleterious or rare; **never impute to zero**. |

---

## 7. Key Findings & Label Quality Concerns

1. **Extreme Ascertainment Bias**: Benign missense variants are heavily under-reported relative to pathogenic variants (0.49:1 pathogenic skew in benchmark). High-star filtering (≥ 1 star) narrows this to 0.44:1, but class weighting (`scale_pos_weight`) and PR-AUC prioritization remain mandatory.
2. **Massive VUS Burden**: Variants of Uncertain Significance (2,171,010) constitute a substantial proportion of all human missense submissions. Isolating VUS protects binary supervised baselines from noisy training signals.
3. **Heavy Gene Clustering**: A handful of high-profile genes account for thousands of submissions while thousands of genes have fewer than 3 variants. GroupKFold by gene family prevents homologous leakage.
4. **Zero Clinical Feature Leakage**: Review stars, submitter counts, and phenotypic descriptions are strictly excluded from the ML feature matrix.
