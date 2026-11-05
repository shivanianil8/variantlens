"""
Pydantic Schemas for VariantLens ML Prediction and TreeSHAP Explainability.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    """Input payload for pathogenicity prediction."""
    gene_symbol: str = Field(..., description="Gene symbol (e.g. BRAF, TP53, BRCA1)", json_schema_extra={"example": "BRAF"})
    wild_type_aa: str = Field(..., description="Wild-type reference amino acid (1- or 3-letter)", json_schema_extra={"example": "Val"})
    mutant_aa: str = Field(..., description="Mutant alternate amino acid (1- or 3-letter)", json_schema_extra={"example": "Glu"})
    protein_position: int = Field(..., description="Positive 1-based residue coordinate", json_schema_extra={"example": 600})
    transcript_id: Optional[str] = Field(None, description="RefSeq or Ensembl transcript accession", json_schema_extra={"example": "NM_004333.6"})
    protein_length: Optional[int] = Field(None, description="Total amino acid chain length if known", json_schema_extra={"example": 766})
    include_clinical: bool = Field(True, description="Whether to query independent ClinVar clinical record")
    include_citations: bool = Field(False, description="Whether to query PubMed literature citations")


class FeatureAttributionItem(BaseModel):
    """Detailed TreeSHAP feature contribution."""
    feature_name: str
    display_name: str
    feature_value: float
    signed_shap_value: float
    absolute_shap_value: float
    directional_effect: str
    biological_meaning: str


class ModelPredictionDetails(BaseModel):
    """Model output and explainability."""
    pathogenicity_probability: float = Field(..., description="Predicted probability score from sigmoid of XGBoost margin (0.0 to 1.0)")
    binary_classification: int = Field(..., description="1 = Class 1 (Score >= 0.50), 0 = Class 0 (Score < 0.50)")
    prediction_category: str = Field(..., description="Computational score tier based on raw model score (NOT a clinical classification)")
    decision_threshold: float = 0.50
    model_version: str
    prediction_provenance: str = Field(
        "Final Deployed Model (Trained on 202,575 ClinVar cohort; out-of-fold cross-validation evaluated separately)",
        description="Identifies model weight provenance"
    )
    oof_benchmark_score: Optional[float] = Field(
        None,
        description="Out-of-fold cross-validation score when variant was held out during 5-fold evaluation"
    )
    shap_base_value: float
    feature_attributions: List[FeatureAttributionItem]
    clinical_override_notice: str = Field(
        "A low or intermediate computational score does NOT override expert clinical assertions or diagnostic evidence. Computational scoring evaluates general statistical patterns in ClinVar and cannot capture whole-protein allosteric collapse or conformational destabilization (such as zinc-coordination disruption in TP53 R175H).",
        description="Explicit notice regarding clinical evidence precedence"
    )


class NormalizedVariantSummary(BaseModel):
    """Canonical variant identifiers."""
    normalized_id: str
    gene_symbol: str
    wild_type_aa: str
    mutant_aa: str
    protein_position: int
    protein_change_hgvs: str
    protein_change_short: str
    transcript_id: Optional[str] = None


class ClinicalAnnotationRecord(BaseModel):
    """Independent ClinVar consensus annotation."""
    source: str
    record: Optional[Dict[str, Any]] = None
    clinical_vs_model_notice: str


class ResidueVerificationDetails(BaseModel):
    """Biological verification of amino acid residue against canonical translated sequence."""
    is_verified: bool
    expected_wild_type: Optional[str] = None
    observed_wild_type: str
    position: int
    sequence_length: Optional[int] = None
    status: str
    warning_message: Optional[str] = None


class BiologicalContext(BaseModel):
    """Biological protein context from UniProt and AlphaFold."""
    gene_symbol: str
    uniprot_accession: Optional[str] = None
    protein_name: Optional[str] = None
    sequence_length: Optional[int] = None
    residue_verification: Optional[ResidueVerificationDetails] = None
    alphafold: Optional[Dict[str, Any]] = None


class PredictResponse(BaseModel):
    """Complete prediction and explanation response."""
    variant: NormalizedVariantSummary
    model_prediction: ModelPredictionDetails
    features_used: Dict[str, float]
    missing_information: List[str]
    clinical_annotation: ClinicalAnnotationRecord
    biological_context: Optional[BiologicalContext] = None
    citations: Optional[List[Dict[str, Any]]] = None
    disclaimer: str
