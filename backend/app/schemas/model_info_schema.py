"""
Pydantic Schemas for VariantLens Model Metadata & Offline Evaluation Metrics.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ModelMetricSummary(BaseModel):
    """Out-of-fold performance metrics for an evaluated model."""
    model_name: str
    roc_auc: float
    roc_auc_std: Optional[float] = None
    pr_auc: float
    pr_auc_std: Optional[float] = None
    balanced_accuracy: float
    brier_score: float
    recall_at_0_5: float
    precision_at_0_5: float
    f1_score_at_0_5: float


class GlobalFeatureRankingItem(BaseModel):
    """TreeSHAP global importance ranking."""
    rank: int
    feature_name: str
    display_name: str
    mean_abs_shap: float
    directional_summary: str


class ModelMetadataResponse(BaseModel):
    """Complete official model card and offline evaluation metrics."""
    model_name: str = "VariantLens XGBoost Pathogenicity Predictor"
    model_version: str = "1.0.0-xgb-gene-held-out"
    is_trained: bool = True
    status: str = "production_ready"
    training_date: str = "2026-11-05"
    training_cohort_size: int = 202575
    positive_class_prevalence: float = 0.3054
    feature_names: List[str]
    training_dataset_provenance: Dict[str, Any]
    evaluation_methodology: str
    label_provenance: str = "Strict Offline Out-Of-Fold Evaluation (5-Fold GroupKFold across 15,115 connected gene groups)"
    oof_evaluation_metrics: Dict[str, Any]
    structural_experiment: Dict[str, Any]
    tree_shap_global_ranking: List[GlobalFeatureRankingItem]
    model_limitations: List[str]
    leakage_safeguards: List[str]
    disclaimer: str
