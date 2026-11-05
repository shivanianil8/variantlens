export interface NormalizedVariant {
  raw_query?: string;
  normalized_id?: string;
  gene_symbol: string;
  wild_type_aa: string;
  mutant_aa: string;
  protein_position: number;
  transcript_id?: string;
  cdna_change?: string;
  protein_change?: string;
  protein_change_hgvs?: string;
  protein_change_short?: string;
  rs_id?: string;
  genomic_location?: string;
  assembly?: string;
}

export interface ClinVarClinicalRecord {
  variation_id?: string;
  clinical_significance: string;
  clinical_significance_raw?: string;
  review_status: string;
  review_stars: number;
  last_evaluated?: string;
  submitter_count: number;
  all_traits: string[];
  assertion_type?: string;
  source_attribution?: string;
  is_live_api?: boolean;
}

export interface GnomadFrequencyRecord {
  allele_frequency?: number | null;
  allele_count?: number | null;
  allele_number?: number | null;
  homozygous_count?: number | null;
  populations: Record<string, number>;
  is_observed: boolean;
}

export interface VariantAnnotationResponse {
  variant: NormalizedVariant;
  clinvar_clinical?: ClinVarClinicalRecord | null;
  gnomad_frequency: GnomadFrequencyRecord;
  uniprot_accession?: string | null;
  protein_name?: string | null;
  alphafold_pdb_url?: string | null;
  alphafold_cif_url?: string | null;
  alphafold_plddt_score?: number | null;
  data_provenance: Record<string, string>;
}

export interface FeatureAttributionItem {
  feature_name: string;
  display_name: string;
  feature_value: number;
  signed_shap_value: number;
  absolute_shap_value: number;
  directional_effect: string;
  biological_meaning: string;
}

export interface ModelPredictionDetails {
  pathogenicity_probability: number;
  binary_classification: number;
  prediction_category: string;
  decision_threshold: number;
  model_version: string;
  prediction_provenance?: string;
  oof_benchmark_score?: number | null;
  clinical_override_notice?: string;
  shap_base_value: number;
  feature_attributions: FeatureAttributionItem[];
}

export interface ClinicalAnnotationRecord {
  source: string;
  record?: ClinVarClinicalRecord | null;
  clinical_vs_model_notice: string;
}

export interface AlphaFoldStructureData {
  uniprot_accession: string;
  pdb_url?: string;
  cif_url?: string;
  model_url?: string;
  global_plddt?: number | null;
  latest_version?: number;
  source_attribution: string;
  is_live_api: boolean;
}

export interface ResidueVerificationDetails {
  is_verified: boolean;
  expected_wild_type?: string | null;
  observed_wild_type: string;
  position: number;
  sequence_length?: number | null;
  status: string;
  warning_message?: string | null;
}

export interface BiologicalContext {
  gene_symbol: string;
  uniprot_accession?: string;
  protein_name?: string;
  sequence_length?: number;
  residue_verification?: ResidueVerificationDetails | null;
  alphafold?: AlphaFoldStructureData | null;
}

export interface PubMedCitation {
  pmid: string;
  title: string;
  authors_formatted: string;
  all_authors: string[];
  journal: string;
  pub_date: string;
  doi?: string;
  pubmed_url: string;
  doi_url?: string | null;
  source_attribution: string;
}

export interface PredictRequest {
  gene_symbol: string;
  wild_type_aa: string;
  mutant_aa: string;
  protein_position: number;
  transcript_id?: string;
  protein_length?: number;
  include_clinical?: boolean;
  include_citations?: boolean;
}

export interface PredictResponse {
  variant: NormalizedVariant;
  model_prediction: ModelPredictionDetails;
  features_used: Record<string, number>;
  missing_information: string[];
  clinical_annotation: ClinicalAnnotationRecord;
  biological_context?: BiologicalContext | null;
  citations?: PubMedCitation[] | null;
  disclaimer: string;
}

export interface GlobalFeatureRankingItem {
  rank: number;
  feature_name: string;
  display_name: string;
  mean_abs_shap: number;
  directional_summary: string;
}

export interface ModelMetricSummary {
  model_name: string;
  roc_auc: number;
  roc_auc_std?: number;
  pr_auc: number;
  pr_auc_std?: number;
  balanced_accuracy: number;
  brier_score: number;
  recall_at_0_5: number;
  precision_at_0_5: number;
  f1_score_at_0_5: number;
  confusion_matrix?: number[][];
}

export interface ModelMetadataResponse {
  model_name: string;
  model_version: string;
  is_trained: boolean;
  status: string;
  training_date: string;
  training_cohort_size: number;
  positive_class_prevalence: number;
  feature_names: string[];
  training_dataset_provenance: {
    source: string;
    file_name: string;
    sha256: string;
    inclusion_criteria: string;
    excluded_from_training: string;
    positive_label: string;
    negative_label: string;
  };
  evaluation_methodology: string;
  label_provenance: string;
  oof_evaluation_metrics: Record<string, ModelMetricSummary>;
  structural_experiment: {
    subset_size?: number;
    subset_genes_count?: number;
    genes?: string[];
    cv_strategy?: string;
    core_features_oof?: {
      roc_auc: number;
      pr_auc: number;
      balanced_accuracy: number;
    };
    extended_features_oof_plddt?: {
      roc_auc: number;
      pr_auc: number;
      balanced_accuracy: number;
    };
    delta_roc_auc?: number;
  };
  tree_shap_global_ranking: GlobalFeatureRankingItem[];
  model_limitations: string[];
  leakage_safeguards: string[];
  disclaimer: string;
}

export interface SystemHealth {
  status: string;
  service: string;
  version: string;
  environment: string;
  runtime_info: {
    python_version: string;
    debug: boolean;
    fastapi: string;
  };
}
