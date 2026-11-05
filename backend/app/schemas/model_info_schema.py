from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class BaselineModelCard(BaseModel):
    name: str
    description: str
    status: str

class ModelMetadataResponse(BaseModel):
    model_name: str = "VariantLens XGBoost Pathogenicity Predictor"
    status: str = Field("awaiting_training_phase_2", description="Status of the statistical model")
    is_trained: bool = False
    evaluation_strategy: str = "Gene-level GroupKFold (group-held-out by gene family)"
    leakage_safeguards: List[str]
    planned_baselines: List[str]
    feature_dimensions: List[str]
    disclaimer: str
