# Feature Distribution & Statistical Summary Report

**Generated**: Phase 3 Feature Extraction  
**Dataset**: `variant_features.parquet` (202,575 variants)  

---

## 1. Summary Statistics of Continuous Features

| Feature | Mean | Std Dev | Min | Median (50%) | Max |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`grantham_distance`** | 74.04 | 46.02 | 5 | 60.0 | 215 |
| **`blosum62_score`** | -0.34 | 1.67 | -3 | 0.0 | 3 |
| **`hydropathy_delta`** | 0.30 | 3.16 | -9.0 | 0.3 | 9.0 |
| **`charge_delta`** | -0.03 | 0.66 | -2.0 | 0.0 | 2.0 |
| **`molecular_weight_delta`** | 3.61 | 37.53 | -129.16 | 0.98 | 129.16 |
| **`relative_protein_position`** | 0.5412 | 0.3079 | 0.0001 | 0.5452 | 1.0 |
| **`absolute_protein_position`** | 802.4 | 1724.6 | 1 | 400.0 | 35956 |

---

## 2. Overlapping-Gene Connected Components (Leakage Safeguard)

- **Total Unique Overlapping Groups**: 15,115
- **Largest Connected Components**:
- **gene_group_FBN1**: 1,509 variants
- **gene_group_TTN**: 1,243 variants
- **gene_group_LOC102724058**: 1,139 variants
- **gene_group_KMT2D**: 1,096 variants
- **gene_group_DNAH11**: 1,038 variants
- **gene_group_BRCA2**: 851 variants
- **gene_group_COL4A5**: 836 variants
- **gene_group_COL4A3**: 758 variants
- **gene_group_PKD1**: 742 variants
- **gene_group_LDLR**: 740 variants

### Methodological Discussion on Homologs & Paralogs:
> **Important Scientific Note**: Overlapping-gene connected components ensure that genomic loci covering overlapping genes (e.g. *LDLR;MIR6886*) are never split across train and test sets. However, **overlapping-gene grouping does NOT independently eliminate paralogous or homologous gene family leakage** (e.g., duplicated gene families on distinct chromosomes such as *HBA1* vs *HBA2*, *PMS2* vs *PMS2CL*, or *SMN1* vs *SMN2*). In Phase 4, we will document paralog sequence homology considerations and family-level held-out splits.
