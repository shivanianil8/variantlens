from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class VariantQuery(BaseModel):
    query: str = Field(..., description="Gene symbol, rsID, HGVS cDNA/protein (e.g. BRAF V600E, rs113488022)")

class NormalizedVariant(BaseModel):
    raw_query: str
    gene_symbol: str
    wild_type_aa: str
    mutant_aa: str
    protein_position: int
    transcript_id: Optional[str] = None
    cdna_change: Optional[str] = None
    protein_change: str
    rs_id: Optional[str] = None
    genomic_location: Optional[str] = None
    assembly: str = "GRCh38"

class ClinVarClinicalRecord(BaseModel):
    variation_id: Optional[str] = None
    clinical_significance: str = Field(..., description="ClinVar gold standard classification")
    review_status: str
    review_stars: int
    last_evaluated: Optional[str] = None
    submitter_count: int = 0
    all_traits: List[str] = Field(default_factory=list)
    assertion_type: str = "clinical_consensus"

class GnomadFrequencyRecord(BaseModel):
    allele_frequency: Optional[float] = Field(None, description="Global exome allele frequency. None indicates unobserved in dataset.")
    allele_count: Optional[int] = None
    allele_number: Optional[int] = None
    homozygous_count: Optional[int] = None
    populations: Dict[str, float] = Field(default_factory=dict, description="Ancestry population frequencies")
    is_observed: bool = False

class VariantAnnotationResponse(BaseModel):
    variant: NormalizedVariant
    clinvar_clinical: Optional[ClinVarClinicalRecord] = None
    gnomad_frequency: GnomadFrequencyRecord
    uniprot_accession: Optional[str] = None
    protein_name: Optional[str] = None
    alphafold_pdb_url: Optional[str] = None
    alphafold_cif_url: Optional[str] = None
    alphafold_plddt_score: Optional[float] = None
    data_provenance: Dict[str, str] = Field(default_factory=dict)
