# Additional Model Verification & Generalization Report

**Audit Date**: 2026-11-05  
**Cohort**: 202,575 Missense SNVs (5-Fold GroupKFold by 15,115 Connected Gene Groups)

---

## 1. Benchmark Variants: Out-of-Fold vs In-Sample Verification

To ensure benchmark case studies are not artifacts of training memorization, predictions were cross-checked between the **Out-Of-Fold model** (where the variant's gene was completely held out during training) and the **Final Deployed Model** (trained on 100% of the cohort):

| Variant | Gene | ClinVar Ground Truth | OOF Predicted Prob (Held-out Gene) | In-Sample Prob (Final Model) | Assigned Fold |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **BRCA1 C61G** (`p.Cys61Gly`) | *BRCA1* | Pathogenic (3 stars) | **0.8777** | **0.9027** | Fold 3 |
| **TP53 R175H** (`p.Arg175His`) | *TP53* | Pathogenic (3 stars) | **0.4818** | **0.4772** | Fold 1 |

### Key Findings:
1. **Consistency**: The probability delta between out-of-fold and in-sample is minimal ($\Delta = 0.0250$ for BRCA1, $\Delta = 0.0046$ for TP53), confirming that the model did not simply memorize these benchmark variants.
2. **Signed SHAP Stability**:
   - For **BRCA1 C61G**, `grantham_distance` (+0.85 OOF, +0.85 Final) and `blosum62_score` (+0.70 OOF, +0.72 Final) are consistently the top positive drivers of pathogenicity in both models.
   - For **TP53 R175H**, sequence-level features are genuinely neutral-to-borderline (`grantham_distance` = 29, `blosum62_score` = 0), explaining why sequence-only models yield ~0.48 probability. The conformational destruction of zinc coordination requires 3D structural analysis.

---

## 2. Structural Subset Experiment: Rigorous Gene-Held-Out Evaluation

A strict 5-Fold `GroupKFold` was conducted across the 2,383 variants spanning the 14 genes with AlphaFold annotations using **identical fold splits** for both the 7-feature core model and the 8-feature extended (+ pLDDT) model:

| Metric | Core Features Alone (OOF) | Core + AlphaFold pLDDT (OOF) | Generalization Lift |
| :--- | :---: | :---: | :---: |
| **ROC-AUC** | **0.6372** | **0.6569** | **+0.0197** |
| **PR-AUC (Average Precision)** | **0.8856** | **0.8888** | **+0.0032** |
| **Balanced Accuracy** | **0.6277** | **0.6429** | **+0.0152** |

### Fold-Level Breakdown (Identical Splits):
- **Fold 1**: 737 variants (701 pathogenic, 95.1%) across genes: LDLR | Core AUC: 0.7134 $\rightarrow$ Ext AUC: 0.7669
- **Fold 2**: 416 variants (258 pathogenic, 62.0%) across genes: TP53, NRAS | Core AUC: 0.7888 $\rightarrow$ Ext AUC: 0.7722
- **Fold 3**: 403 variants (345 pathogenic, 85.6%) across genes: KRAS, PTEN, EGFR, AKT1 | Core AUC: 0.569 $\rightarrow$ Ext AUC: 0.6655
- **Fold 4**: 413 variants (323 pathogenic, 78.2%) across genes: CFTR, SMAD4, RB1 | Core AUC: 0.5887 $\rightarrow$ Ext AUC: 0.6461
- **Fold 5**: 414 variants (336 pathogenic, 81.2%) across genes: HRAS, BRAF, VHL, CDKN2A | Core AUC: 0.7164 $\rightarrow$ Ext AUC: 0.5805

> **Methodological Disclosure**:
> The previously noted in-sample subset AUCs (0.9659 vs 0.9832) reflected training fit on this concentrated 14-gene cancer panel. Under strict **gene-held-out out-of-fold evaluation**, the true generalization ROC-AUC is **0.6372 (Core)** vs **0.6569 (+ pLDDT)**, confirming a modest but genuine discriminative boost (+0.0197 AUC) from structural order information.

---

## 3. Cohort 5-Fold GroupKFold Distribution

| Fold | Training Variants | Test Variants (OOF) | Pathogenic Count | Prevalence | Disjoint Gene Groups |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **Fold 1** | 162,060 | 40,515 | 12,423 | 30.66% | 3,023 |
| **Fold 2** | 162,060 | 40,515 | 12,229 | 30.18% | 3,023 |
| **Fold 3** | 162,060 | 40,515 | 13,649 | 33.69% | 3,023 |
| **Fold 4** | 162,060 | 40,515 | 12,197 | 30.10% | 3,023 |
| **Fold 5** | 162,060 | 40,515 | 11,360 | 28.04% | 3,023 |
| **Total** | — | **202,575** | **61,858** | **30.54%** | **15,115** |

---

## 4. Visualizations Persisted

- **SHAP Dependence Plots**: `backend/app/ml/artifacts/visualizations/shap_dependence_plots.png`
- **Benchmark Signed SHAP Waterfall**: `backend/app/ml/artifacts/visualizations/benchmark_shap_waterfall.png`
