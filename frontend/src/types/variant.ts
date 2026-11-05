export interface NormalizedVariant {
  raw_query: string;
  gene_symbol: string;
  wild_type_aa: string;
  mutant_aa: string;
  protein_position: number;
  transcript_id?: string;
  cdna_change?: string;
  protein_change: string;
  rs_id?: string;
  genomic_location?: string;
  assembly: string;
}

export interface ClinVarClinicalRecord {
  variation_id?: string;
  clinical_significance: string;
  review_status: string;
  review_stars: number;
  last_evaluated?: string;
  submitter_count: number;
  all_traits: string[];
  assertion_type: string;
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

export interface ModelMetadataResponse {
  model_name: string;
  status: string;
  is_trained: boolean;
  evaluation_strategy: string;
  leakage_safeguards: string[];
  planned_baselines: string[];
  feature_dimensions: string[];
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
