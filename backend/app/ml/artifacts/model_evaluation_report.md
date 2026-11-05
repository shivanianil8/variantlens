# VariantLens Machine Learning Model Evaluation Report

**Date of Experiment**: 2026-11-05  
**Cohort**: Validated High-Confidence ClinVar Missense SNVs ($\ge 1$ Star)  
**Total Dataset Size**: 202,575 variants  
**Evaluation Scheme**: Strict 5-Fold `GroupKFold` across 15,115 connected gene groups  
**Positive Class Prevalence (Pathogenic)**: 30.54% (61,858 / 202,575)  

---

## 1. Out-Of-Fold Comparative Performance

All metrics were computed strictly from out-of-fold test predictions across the 5 gene-held-out folds. Preprocessing was fitted exclusively on training folds.

| Model | ROC-AUC | PR-AUC (Average Precision) | Balanced Accuracy | Brier Score | Recall (>= 0.5) | Precision (>= 0.5) | F1-Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dummy Majority Baseline** | 0.5000 | 0.2941 | 0.5000 | 0.2123 | 0.0000 | 0.0000 | 0.0000 |
| **Logistic Regression (L2)** | 0.7162 $\pm$ 0.007 | 0.5321 $\pm$ 0.028 | 0.6612 | 0.2131 | 0.6342 | 0.4720 | 0.5412 |
| **Random Forest Ensemble** | 0.7993 $\pm$ 0.009 | 0.6475 $\pm$ 0.019 | 0.7242 | 0.1802 | 0.6720 | 0.5692 | 0.6163 |
| **XGBoost Classifier** | **0.8076 $\pm$ 0.008** | **0.6576 $\pm$ 0.018** | **0.7327** | **0.1765** | **0.7100** | **0.5607** | **0.6266** |

> **Key Observation**: The positive-class prevalence in this cohort is **30.54%**. Therefore, a random or naive prior model achieves a baseline PR-AUC of **0.3054**. XGBoost achieves a **PR-AUC of 0.6576**, demonstrating substantial discriminative lift over both the linear baseline and tree ensemble.

---

## 2. Confusion Matrices (Default 0.5 Decision Boundary)

### XGBoost Confusion Matrix
- **True Negatives (Correct Benign)**: 106,299
- **False Positives (Benign called Pathogenic)**: 34,418
- **False Negatives (Pathogenic called Benign)**: 17,937
- **True Positives (Correct Pathogenic)**: 43,921

---

## 3. TreeSHAP Global Feature Importance & Directional Attributions

Global feature ranking derived from exact Shapley values on the trained XGBoost model:

| Rank | Biological Feature | Mean $|\text{SHAP}|$ | Primary Directional Effect |
| :---: | :--- | :---: | :--- |
| **1** | **`blosum62_score`** | **0.4778** | Highly negative BLOSUM62 scores strongly push predictions toward pathogenicity. |
| **2** | **`absolute_protein_position`** | **0.4607** | Large Grantham divergence increases predicted pathogenicity log-odds. |
| **3** | **`relative_protein_position`** | **0.3896** | Disruption of hydrophobic core stability increases probability. |
| **4** | **`grantham_distance`** | **0.2990** | Net electrostatic charge shifts impact salt bridges and functional binding. |
| **5** | **`hydropathy_delta`** | **0.2234** | Steric bulk differential in close-packed protein regions. |
| **6** | **`molecular_weight_delta`** | **0.1449** | Positional coordinate along the translated polypeptide. |
| **7** | **`charge_delta`** | **0.0811** | Global residue offset. |

---

## 4. Benchmark Variant Case Studies (Individual Explanations)

### TP53 R175H (TP53 p.Arg175His)
- **Predicted Pathogenicity Probability**: `0.4772`
- **Base Expected Value**: `0.0026`
- **Top Pathogenic Drivers**: relative_protein_position (+0.28), absolute_protein_position (+0.35)
- **Top Protective Drivers**: grantham_distance (-0.38), blosum62_score (-0.20), hydropathy_delta (-0.05), charge_delta (-0.05), molecular_weight_delta (-0.05)
- **Mechanistic Rationale**: Balanced biophysical features across local sequence context.

### BRCA1 C61G (BRCA1 p.Cys61Gly)
- **Predicted Pathogenicity Probability**: `0.9027`
- **Base Expected Value**: `0.0026`
- **Top Pathogenic Drivers**: grantham_distance (+0.85), blosum62_score (+0.72), hydropathy_delta (+0.43), molecular_weight_delta (+0.35), absolute_protein_position (+0.43)
- **Top Protective Drivers**: charge_delta (-0.03), relative_protein_position (-0.54)
- **Mechanistic Rationale**: High Grantham distance (159) indicates major biophysical divergence. Negative BLOSUM62 score (-3) reflects strong evolutionary intolerance. Hydropathy shift (-2.9) destabilizes domain microenvironment.


---

## 5. Experiment B: Extended Structural Feature Evaluation

- **Status**: Evaluated strictly on the structural subset where real AlphaFold models are indexed (2,383 variants across 14 genes).
- **Core Features Alone on Subset**: AUC = `0.9659`
- **Core Features + AlphaFold pLDDT on Subset**: AUC = `0.9832`
- **Methodological Disclosure**: Because genome-wide gnomAD is uncataloged in this ClinVar release and AlphaFold coverage across 15,000 genes is sparse, extended features were **not imputed to zero or fabricated**. They are provided as a transparent supplementary analysis.

---

## 6. Leakage Safeguards & Methodological Disclaimers

1. **Gene-Held-Out Generalization Disclaimer**: While our 5-fold `GroupKFold` strictly prevents variants in overlapping gene groups (e.g. *LDLR;MIR6886*) from appearing in both train and test partitions, **GroupKFold does NOT independently guarantee zero leakage for duplicated paralogs or gene families on separate chromosomes** (e.g. *HBA1* vs *HBA2*).
2. **Explanations vs Causality**: TreeSHAP values reflect statistical directional contributions to the tree ensemble margin, **not proof of biological causality**.
3. **Regulatory Non-Diagnostic Disclaimer**: VariantLens is an educational and exploratory computational research platform, not validated for clinical diagnostic use.
