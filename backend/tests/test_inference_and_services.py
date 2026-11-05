"""
Automated Integration and Unit Tests for VariantLens Phase 5.
Validates model loading, feature schema consistency, prediction reproducibility,
TreeSHAP explainability, input validation, clinical vs computational separation,
biological service resilience, and FastAPI prediction endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ml.predictor import (
    get_predictor,
    PathogenicityPredictor,
    UnsupportedVariantError,
    VariantPredictorError,
    CORE_FEATURE_ORDER,
)
from app.services.clinvar_service import clinvar_service
from app.services.uniprot_service import uniprot_service
from app.services.alphafold_service import alphafold_service
from app.services.pubmed_service import pubmed_service


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def predictor():
    return get_predictor()


# -----------------------------------------------------------------------------
# 1. Model Loading & Feature Schema Consistency
# -----------------------------------------------------------------------------
def test_model_loading_and_schema_consistency(predictor):
    """Ensures model loads properly and feature schema matches training exactly."""
    assert predictor.model is not None
    assert predictor.explainer is not None
    assert len(predictor.core_features) == 7
    assert predictor.core_features == CORE_FEATURE_ORDER
    assert predictor.model_version.startswith("1.0.0")


# -----------------------------------------------------------------------------
# 2. Valid Variant Predictions & Amino Acid Equivalence
# -----------------------------------------------------------------------------
def test_valid_variant_predictions(predictor):
    """Tests predictions on benchmark controls BRCA1 C61G and TP53 R175H."""
    # BRCA1 C61G
    res_brca1 = predictor.predict(
        gene_symbol="BRCA1",
        wild_type_aa="C",
        mutant_aa="G",
        protein_position=61,
    )
    assert res_brca1["model_prediction"]["pathogenicity_probability"] > 0.85
    assert res_brca1["model_prediction"]["binary_classification"] == 1
    assert "Pathogenic" in res_brca1["model_prediction"]["prediction_category"]
    assert res_brca1["variant"]["protein_change_hgvs"] == "p.Cys61Gly"

    # TP53 R175H
    res_tp53 = predictor.predict(
        gene_symbol="TP53",
        wild_type_aa="R",
        mutant_aa="H",
        protein_position=175,
    )
    # Sequence-level model predicts borderline/neutral probability for Arg->His
    assert 0.40 <= res_tp53["model_prediction"]["pathogenicity_probability"] <= 0.55
    assert res_tp53["variant"]["protein_change_hgvs"] == "p.Arg175His"

    # 3-letter vs 1-letter code equivalence
    res_brca1_3letter = predictor.predict(
        gene_symbol="BRCA1",
        wild_type_aa="Cys",
        mutant_aa="Gly",
        protein_position=61,
    )
    assert (
        res_brca1["model_prediction"]["pathogenicity_probability"]
        == res_brca1_3letter["model_prediction"]["pathogenicity_probability"]
    )


# -----------------------------------------------------------------------------
# 3. Invalid and Unsupported Inputs
# -----------------------------------------------------------------------------
def test_invalid_and_unsupported_variant_inputs(predictor):
    """Verifies that non-missense, synonymous, and malformed inputs are caught explicitly."""
    # Synonymous variant
    with pytest.raises(UnsupportedVariantError, match="Synonymous substitution"):
        predictor.predict("BRAF", "V", "V", 600)

    # Invalid amino acid
    with pytest.raises(UnsupportedVariantError, match="Invalid amino acid"):
        predictor.predict("BRAF", "X", "E", 600)

    with pytest.raises(UnsupportedVariantError, match="Invalid amino acid"):
        predictor.predict("BRAF", "Val", "ZZZ", 600)

    # Non-positive residue position
    with pytest.raises(VariantPredictorError, match="Invalid residue position"):
        predictor.predict("BRAF", "V", "E", 0)

    with pytest.raises(VariantPredictorError, match="Invalid residue position"):
        predictor.predict("BRAF", "V", "E", -10)


# -----------------------------------------------------------------------------
# 4. Missing Protein Mappings & Fallbacks
# -----------------------------------------------------------------------------
def test_missing_protein_mapping_fallback(predictor):
    """Ensures uncataloged gene protein lengths fallback gracefully without crashing."""
    res = predictor.predict(
        gene_symbol="UNKNOWN_GENE_123",
        wild_type_aa="A",
        mutant_aa="T",
        protein_position=42,
    )
    assert res["model_prediction"]["pathogenicity_probability"] >= 0.0
    assert len(res["missing_information"]) > 0
    assert "not found in local catalog" in res["missing_information"][0]


# -----------------------------------------------------------------------------
# 5. Prediction Reproducibility & Determinism
# -----------------------------------------------------------------------------
def test_prediction_reproducibility(predictor):
    """Confirms multiple runs produce identical probabilities and SHAP attributions."""
    res1 = predictor.predict("BRAF", "V", "E", 600)
    res2 = predictor.predict("BRAF", "V", "E", 600)

    assert res1["model_prediction"]["pathogenicity_probability"] == res2["model_prediction"]["pathogenicity_probability"]
    assert res1["model_prediction"]["shap_base_value"] == res2["model_prediction"]["shap_base_value"]
    for a1, a2 in zip(res1["model_prediction"]["feature_attributions"], res2["model_prediction"]["feature_attributions"]):
        assert a1["signed_shap_value"] == a2["signed_shap_value"]
        assert a1["feature_name"] == a2["feature_name"]


# -----------------------------------------------------------------------------
# 6. TreeSHAP Attribution Consistency
# -----------------------------------------------------------------------------
def test_shap_explanation_consistency(predictor):
    """Verifies that TreeSHAP feature attributions have valid directions and cover all 7 features."""
    res = predictor.predict("BRCA1", "C", "G", 61)
    attribs = res["model_prediction"]["feature_attributions"]
    assert len(attribs) == 7

    # Should be sorted descending by absolute SHAP
    magnitudes = [a["absolute_shap_value"] for a in attribs]
    assert magnitudes == sorted(magnitudes, reverse=True)

    # Grantham distance and BLOSUM62 should be top deleterious contributors
    top_feature_names = [a["feature_name"] for a in attribs[:3]]
    assert "grantham_distance" in top_feature_names
    assert "blosum62_score" in top_feature_names


# -----------------------------------------------------------------------------
# 7. Clinical vs Computational Separation
# -----------------------------------------------------------------------------
def test_clinical_vs_computational_separation(predictor):
    """Confirms that clinical assertions NEVER alter in silico model probabilities."""
    pred_without_clinical = predictor.predict(
        gene_symbol="BRAF",
        wild_type_aa="V",
        mutant_aa="E",
        protein_position=600,
        clinvar_clinical_record=None,
    )

    pred_with_clinical = predictor.predict(
        gene_symbol="BRAF",
        wild_type_aa="V",
        mutant_aa="E",
        protein_position=600,
        clinvar_clinical_record={"clinical_significance": "Benign", "review_stars": 4},
    )

    # In silico probability must be completely invariant to clinical record
    assert (
        pred_without_clinical["model_prediction"]["pathogenicity_probability"]
        == pred_with_clinical["model_prediction"]["pathogenicity_probability"]
    )
    assert (
        pred_without_clinical["model_prediction"]["binary_classification"]
        == pred_with_clinical["model_prediction"]["binary_classification"]
    )


# -----------------------------------------------------------------------------
# 8. API Endpoint POST /api/predict
# -----------------------------------------------------------------------------
def test_api_predict_endpoint_success(client):
    """Tests live POST /api/predict endpoint with valid payload."""
    payload = {
        "gene_symbol": "BRCA1",
        "wild_type_aa": "Cys",
        "mutant_aa": "Gly",
        "protein_position": 61,
        "include_clinical": True,
        "include_citations": False,
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["variant"]["gene_symbol"] == "BRCA1"
    assert data["variant"]["protein_change_hgvs"] == "p.Cys61Gly"
    assert data["model_prediction"]["pathogenicity_probability"] > 0.85
    assert len(data["model_prediction"]["feature_attributions"]) == 7
    assert "clinical_annotation" in data
    assert "disclaimer" in data
    assert "NOT constitute a clinical diagnosis" in data["disclaimer"]


def test_api_predict_endpoint_error_handling(client):
    """Tests API error responses for invalid inputs."""
    # Synonymous substitution -> 400 Bad Request
    resp_syn = client.post("/api/predict", json={
        "gene_symbol": "BRAF",
        "wild_type_aa": "V",
        "mutant_aa": "V",
        "protein_position": 600,
    })
    assert resp_syn.status_code == 400
    assert "Synonymous substitution" in resp_syn.json()["detail"]

    # Invalid amino acid -> 400 Bad Request
    resp_aa = client.post("/api/predict", json={
        "gene_symbol": "BRAF",
        "wild_type_aa": "XYZ",
        "mutant_aa": "E",
        "protein_position": 600,
    })
    assert resp_aa.status_code == 400
    assert "Invalid amino acid" in resp_aa.json()["detail"]

    # Negative position -> 422 Unprocessable Entity
    resp_pos = client.post("/api/predict", json={
        "gene_symbol": "BRAF",
        "wild_type_aa": "V",
        "mutant_aa": "E",
        "protein_position": -5,
    })
    assert resp_pos.status_code == 422
    assert "Invalid residue position" in resp_pos.json()["detail"]


# -----------------------------------------------------------------------------
# 9. API Endpoint GET /api/model/metadata
# -----------------------------------------------------------------------------
def test_api_model_metadata_endpoint(client):
    """Tests GET /api/model/metadata official model card endpoint."""
    response = client.get("/api/model/metadata")
    assert response.status_code == 200
    data = response.json()

    assert data["is_trained"] is True
    assert data["status"] == "production_ready"
    assert data["training_cohort_size"] == 202575
    assert data["positive_class_prevalence"] == 0.3054
    assert len(data["feature_names"]) == 7
    assert "xgboost" in data["oof_evaluation_metrics"]
    xgb_metrics = data["oof_evaluation_metrics"]["xgboost"]
    assert xgb_metrics["roc_auc"] > 0.80
    assert xgb_metrics["pr_auc"] > 0.65
    assert len(data["model_limitations"]) >= 3
    assert len(data["leakage_safeguards"]) >= 3
    assert "Strict Offline Out-Of-Fold Evaluation" in data["label_provenance"]


# -----------------------------------------------------------------------------
# 10. Biological Service Resilience (Graceful degradation)
# -----------------------------------------------------------------------------
@pytest.mark.anyio
async def test_biological_services_resilience():
    """Confirms service clients degrade gracefully and never fabricate false results."""
    # UniProt lookup for known benchmark
    up_info = await uniprot_service.get_protein_info("BRAF")
    assert up_info is not None
    assert up_info["uniprot_accession"] == "P15056"
    assert up_info["sequence_length"] == 766

    # AlphaFold lookup
    af_info = await alphafold_service.get_structure_info("P15056")
    assert af_info is not None
    assert "AF-P15056-F1-model_v4.cif" in af_info["cif_url"]

    # ClinVar lookup for known benchmark
    cv_info = await clinvar_service.get_variant_annotation("BRAF", "V", "E", 600, "p.Val600Glu")
    assert cv_info is not None
    assert "Pathogenic" in cv_info["clinical_significance"]

    # Unknown variant returns None, never invented data
    cv_none = await clinvar_service.get_variant_annotation("NONEXISTENT_GENE_999", "A", "G", 12345, "p.Ala12345Gly")
    assert cv_none is None

    # PubMed client handles offline/unknown gracefully
    citations = await pubmed_service.search_citations("UNKNOWN_XYZ", "A1B", max_results=2)
    assert isinstance(citations, list)
    assert len(citations) == 0
