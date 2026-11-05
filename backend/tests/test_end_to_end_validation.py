"""
End-to-End Validation Test Suite for VariantLens Phase 6.
Tests the three primary benchmark variants (BRAF V600E, TP53 R175H, BRCA1 C61G),
edge case validations, synonymous substitutions, malformed inputs,
and biological service resilience.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# -----------------------------------------------------------------------------
# 1. BRAF V600E End-to-End Validation
# -----------------------------------------------------------------------------
def test_e2e_braf_v600e():
    """Validates complete end-to-end response for BRAF V600E (Val600Glu)."""
    response = client.post("/api/predict", json={
        "gene_symbol": "BRAF",
        "wild_type_aa": "Val",
        "mutant_aa": "Glu",
        "protein_position": 600,
        "include_clinical": True,
        "include_citations": True,
    })
    assert response.status_code == 200
    data = response.json()

    # Variant Identity
    assert data["variant"]["gene_symbol"] == "BRAF"
    assert data["variant"]["wild_type_aa"] == "V"
    assert data["variant"]["mutant_aa"] == "E"
    assert data["variant"]["protein_position"] == 600
    assert data["variant"]["protein_change_hgvs"] == "p.Val600Glu"

    # Prediction & Score
    pred = data["model_prediction"]
    assert pred["pathogenicity_probability"] > 0.80
    assert pred["binary_classification"] == 1
    assert "Pathogenic" in pred["prediction_category"]
    assert pred["decision_threshold"] == 0.50

    # TreeSHAP Attributions (7 features)
    attribs = pred["feature_attributions"]
    assert len(attribs) == 7
    feature_names = [a["feature_name"] for a in attribs]
    assert "grantham_distance" in feature_names
    assert "blosum62_score" in feature_names
    assert "relative_protein_position" in feature_names

    # ClinVar Ground Truth
    assert data["clinical_annotation"]["record"] is not None
    assert "Pathogenic" in data["clinical_annotation"]["record"]["clinical_significance"]
    assert data["clinical_annotation"]["record"]["review_stars"] >= 2

    # Biological Context & Structure
    ctx = data["biological_context"]
    assert ctx is not None
    assert ctx["uniprot_accession"] == "P15056"
    assert "cif_url" in ctx["alphafold"]
    assert "AF-P15056-F1-model_v4.cif" in ctx["alphafold"]["cif_url"]

    # Non-diagnostic disclaimer
    assert "NOT constitute a clinical diagnosis" in data["disclaimer"]


# -----------------------------------------------------------------------------
# 2. TP53 R175H End-to-End Validation
# -----------------------------------------------------------------------------
def test_e2e_tp53_r175h():
    """Validates complete end-to-end response for TP53 R175H (Arg175His)."""
    response = client.post("/api/predict", json={
        "gene_symbol": "TP53",
        "wild_type_aa": "Arg",
        "mutant_aa": "His",
        "protein_position": 175,
        "include_clinical": True,
        "include_citations": True,
    })
    assert response.status_code == 200
    data = response.json()

    # Variant Identity
    assert data["variant"]["gene_symbol"] == "TP53"
    assert data["variant"]["protein_position"] == 175
    assert data["variant"]["protein_change_hgvs"] == "p.Arg175His"

    # Borderline sequence score explained by conservative Arg->His substitution
    pred = data["model_prediction"]
    assert 0.40 <= pred["pathogenicity_probability"] <= 0.55
    assert len(pred["feature_attributions"]) == 7

    # ClinVar Record
    assert data["clinical_annotation"]["record"] is not None
    assert "Pathogenic" in data["clinical_annotation"]["record"]["clinical_significance"]
    assert data["clinical_annotation"]["record"]["review_stars"] >= 2

    # Biological Context
    assert data["biological_context"]["uniprot_accession"] == "P04637"
    assert "AF-P04637-F1-model_v4.cif" in data["biological_context"]["alphafold"]["cif_url"]


# -----------------------------------------------------------------------------
# 3. BRCA1 C61G End-to-End Validation
# -----------------------------------------------------------------------------
def test_e2e_brca1_c61g():
    """Validates complete end-to-end response for BRCA1 C61G (Cys61Gly)."""
    response = client.post("/api/predict", json={
        "gene_symbol": "BRCA1",
        "wild_type_aa": "Cys",
        "mutant_aa": "Gly",
        "protein_position": 61,
        "include_clinical": True,
        "include_citations": True,
    })
    assert response.status_code == 200
    data = response.json()

    # Variant Identity
    assert data["variant"]["gene_symbol"] == "BRCA1"
    assert data["variant"]["protein_position"] == 61
    assert data["variant"]["protein_change_hgvs"] == "p.Cys61Gly"

    # High Confidence Pathogenic Prediction
    pred = data["model_prediction"]
    assert pred["pathogenicity_probability"] > 0.88
    assert pred["binary_classification"] == 1

    # Top deleterious drivers in TreeSHAP
    top_driver_names = [a["feature_name"] for a in pred["feature_attributions"][:2]]
    assert "grantham_distance" in top_driver_names
    assert "blosum62_score" in top_driver_names

    # ClinVar & Context
    assert data["clinical_annotation"]["record"] is not None
    assert "Pathogenic" in data["clinical_annotation"]["record"]["clinical_significance"]
    assert data["biological_context"]["uniprot_accession"] == "P38398"


# -----------------------------------------------------------------------------
# 4. Error Handling & Edge Cases
# -----------------------------------------------------------------------------
def test_e2e_synonymous_substitution_rejected():
    """Confirms synonymous substitutions return 400 Bad Request."""
    response = client.post("/api/predict", json={
        "gene_symbol": "BRAF",
        "wild_type_aa": "Val",
        "mutant_aa": "Val",
        "protein_position": 600,
    })
    assert response.status_code == 400
    assert "Synonymous substitution" in response.json()["detail"]


def test_e2e_invalid_amino_acid_rejected():
    """Confirms malformed or unknown amino acid codes return 400 Bad Request."""
    response = client.post("/api/predict", json={
        "gene_symbol": "BRAF",
        "wild_type_aa": "X",
        "mutant_aa": "Glu",
        "protein_position": 600,
    })
    assert response.status_code == 400
    assert "Invalid amino acid" in response.json()["detail"]


def test_e2e_invalid_residue_coordinate_rejected():
    """Confirms non-positive residue coordinates return 422 Unprocessable Entity."""
    response = client.post("/api/predict", json={
        "gene_symbol": "BRAF",
        "wild_type_aa": "Val",
        "mutant_aa": "Glu",
        "protein_position": 0,
    })
    assert response.status_code == 422
    assert "Invalid residue position" in response.json()["detail"]


def test_e2e_missing_gene_fallback():
    """Confirms uncataloged gene symbols degrade gracefully with documented notice."""
    response = client.post("/api/predict", json={
        "gene_symbol": "UNKNOWN_GENE_999",
        "wild_type_aa": "Ala",
        "mutant_aa": "Thr",
        "protein_position": 42,
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["missing_information"]) > 0
    assert "not found in local catalog" in data["missing_information"][0]


# -----------------------------------------------------------------------------
# 5. Static Artifacts Endpoint Verification
# -----------------------------------------------------------------------------
def test_e2e_static_artifacts_plots():
    """Confirms generated offline evaluation plots are accessible via static mount."""
    roc_resp = client.get("/api/artifacts/visualizations/roc_curves.png")
    assert roc_resp.status_code == 200
    assert "image" in roc_resp.headers.get("content-type", "")

    pr_resp = client.get("/api/artifacts/visualizations/pr_curves.png")
    assert pr_resp.status_code == 200

    shap_resp = client.get("/api/artifacts/visualizations/shap_dependence_plots.png")
    assert shap_resp.status_code == 200
