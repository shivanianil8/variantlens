# Feature Missingness & Provenance Report

**Pipeline Phase**: Phase 3 (Feature Engineering)  
**Total Cohort Records**: 202,575 variants  
**Target Gene Groups**: 15,115 connected components  

---

## 1. Feature Missingness Table

| Feature Name | Present Count | Missing Count | Missing % | Missingness Mechanism & Handling |
| :--- | :--- | :--- | :--- | :--- |
| **`relative_protein_position`** | 202,575 | 0 | 0.0% | Derived from canonical UniProt lengths; fallback to empirical gene max coordinate. |
| **`absolute_protein_position`** | 202,575 | 0 | 0.0% | Complete across all mapped missense SNVs. |
| **`grantham_distance`** | 202,575 | 0 | 0.0% | Complete $20 \times 20$ symmetric published matrix (Grantham 1974). |
| **`blosum62_score`** | 202,575 | 0 | 0.0% | Complete Biopython substitution matrix (Henikoff 1992). |
| **`hydropathy_delta`** | 202,575 | 0 | 0.0% | Complete Kyte-Doolittle empirical scale. |
| **`charge_delta`** | 202,575 | 0 | 0.0% | Complete formal physiological charge scale (pH 7.4). |
| **`molecular_weight_delta`** | 202,575 | 0 | 0.0% | Complete empirical molecular mass table. |
| **`is_observed_in_gnomad`** | 202,575 | 0 | 0.0% | Complete binary indicator. |
| **`gnomad_log10_af`** | 0 | 202,575 | 100.0% | Preserved as `NaN` when absent or uncataloged; **never zero-filled**. |
| **`alphafold_plddt`** | 2,383 | 200,192 | 98.82% | Preserved as `NaN` for non-indexed genes; **never fabricated**. |

---

## 2. Protein Mapping Failure Analysis

- **Total Scanned Input Records**: 202,575
- **Successfully Mapped Variants**: 202,575 (100.0%)
- **Mapping Failures**: 0 (0.0%)

### Failure Breakdown:
- Zero mapping failures detected across the high-confidence cohort.
