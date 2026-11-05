"""
Automated Verification Tests for ML Model Pipeline & Leakage Safeguards.
Verifies GroupKFold group segregation, zero variant leakage, feature consistency,
and model deserialization for inference.
"""

import os
import json
import pytest
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import GroupKFold

def test_artifacts_exist_and_loadable():
    """Verifies that all model artifacts and evaluation metrics exist on disk."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    art_dir = os.path.join(base_dir, "app", "ml", "artifacts")

    model_path = os.path.join(art_dir, "xgboost_pathogenicity_model.json")
    metrics_path = os.path.join(art_dir, "evaluation_metrics.json")
    report_path = os.path.join(art_dir, "model_evaluation_report.md")
    oof_path = os.path.join(art_dir, "oof_predictions.parquet")

    assert os.path.exists(model_path), f"Missing {model_path}"
    assert os.path.exists(metrics_path), f"Missing {metrics_path}"
    assert os.path.exists(report_path), f"Missing {report_path}"
    assert os.path.exists(oof_path), f"Missing {oof_path}"

    # Load model and verify booster
    booster = xgb.Booster()
    booster.load_model(model_path)
    assert booster.num_features() == 7

    # Load metrics JSON
    with open(metrics_path, "r") as f:
        metrics = json.load(f)
    assert metrics["cohort_size"] == 202575
    assert "xgboost" in metrics["models"]
    assert "random_forest" in metrics["models"]
    assert "logistic_regression" in metrics["models"]
    assert "dummy" in metrics["models"]

def test_zero_group_leakage_across_folds():
    """Verifies that every GroupKFold test partition contains zero overlapping groups from train."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    feat_path = os.path.join(base_dir, "data", "processed", "variant_features.parquet")
    df = pd.read_parquet(feat_path)

    groups = df["overlapping_gene_group_id"].values
    X = np.zeros((len(df), 2))
    y = df["target_label"].values

    gkf = GroupKFold(n_splits=5)
    all_test_variants = []

    for fold_idx, (train_idx, test_idx) in enumerate(gkf.split(X, y, groups)):
        train_groups = set(groups[train_idx])
        test_groups = set(groups[test_idx])

        # Strict disjoint set check
        overlap = train_groups.intersection(test_groups)
        assert len(overlap) == 0, f"Critical Data Leakage in Fold {fold_idx}: {len(overlap)} groups shared!"

        # Variant ID disjoint check
        train_vars = set(df.iloc[train_idx]["genomic_id"])
        test_vars = set(df.iloc[test_idx]["genomic_id"])
        var_overlap = train_vars.intersection(test_vars)
        assert len(var_overlap) == 0, f"Variant leakage in Fold {fold_idx}: {len(var_overlap)} variants shared!"

        all_test_variants.extend(list(test_vars))

    # Verify that every variant was in exactly one test partition
    assert len(all_test_variants) == len(df)
    assert len(set(all_test_variants)) == len(df)

def test_inference_probability_bounds():
    """Verifies that XGBoost model produces valid calibrated probabilities in [0, 1]."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    art_dir = os.path.join(base_dir, "app", "ml", "artifacts")
    model_path = os.path.join(art_dir, "xgboost_pathogenicity_model.json")

    model = xgb.XGBClassifier()
    model.load_model(model_path)

    # Test synthetic extreme vectors
    # Extreme benign: Grantham=5, BLOSUM62=3, Hydropathy=0, Charge=0, MW=0, RelPos=0.5, AbsPos=200
    x_benign = np.array([[5, 3, 0.0, 0.0, 0.0, 0.5, 200.0]])
    p_benign = model.predict_proba(x_benign)[0, 1]
    assert 0.0 <= p_benign <= 1.0

    # Extreme pathogenic: Grantham=215, BLOSUM62=-3, Hydropathy=-8.0, Charge=-2.0, MW=100.0, RelPos=0.1, AbsPos=50.0
    x_pathogenic = np.array([[215, -3, -8.0, -2.0, 100.0, 0.1, 50.0]])
    p_pathogenic = model.predict_proba(x_pathogenic)[0, 1]
    assert 0.0 <= p_pathogenic <= 1.0

    # Strong biophysical disruption must produce higher pathogenicity probability than mild conservative change
    assert p_pathogenic > p_benign, f"Expected p_pathogenic ({p_pathogenic}) > p_benign ({p_benign})"
