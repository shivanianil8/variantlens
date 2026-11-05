from fastapi import APIRouter
from app.schemas.model_info_schema import ModelMetadataResponse

router = APIRouter(prefix="/model", tags=["Model Information"])

@router.get("/metadata", response_model=ModelMetadataResponse)
async def get_model_metadata():
    """Returns official model card, training status, and methodological safeguards."""
    return ModelMetadataResponse(
        model_name="VariantLens In Silico Pathogenicity Predictor",
        status="awaiting_training_phase_2",
        is_trained=False,
        evaluation_strategy="Strict Gene-Level GroupKFold (all variants of a gene held out together)",
        leakage_safeguards=[
            "Strict GroupKFold by gene family to prevent memorization of gene-level traits",
            "Zero post-hoc clinical features (no ClinVar review stars, submitter counts, or disease phenotypes)",
            "Preservation of missingness semantics (missing gnomAD frequency is NEVER treated as zero)",
            "Deduplication across equivalent HGVS/genomic coordinate representations"
        ],
        planned_baselines=[
            "Dummy Prior / Majority Class Baseline",
            "Logistic Regression Baseline (L2 regularization, standardized features)",
            "Random Forest Baseline (Ensemble trees, out-of-bag validation)",
            "XGBoost Classifier (Primary model with TreeSHAP explainability)"
        ],
        feature_dimensions=[
            "Grantham amino acid distance (physicochemical divergence)",
            "BLOSUM62 substitution score (evolutionary log-odds)",
            "Kyte-Doolittle hydropathy difference",
            "Physiological formal charge delta (at pH 7.4)",
            "Molecular weight delta (Daltons)",
            "Normalized protein chain position",
            "gnomAD exome allele frequency & observed indicator",
            "AlphaFold residue-level pLDDT structural confidence",
            "Protein functional domain annotation"
        ],
        disclaimer="VariantLens is an educational and exploratory computational research platform. It is NOT a clinical diagnostic tool and must not be used for medical decision making."
    )
