import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert data["service"] == "VariantLens API"

def test_benchmark_variants():
    response = client.get("/api/variants/benchmarks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3
    braf = next((v for v in data if v["variant"]["gene_symbol"] == "BRAF"), None)
    assert braf is not None
    assert braf["variant"]["protein_position"] == 600
    assert braf["clinvar_clinical"]["clinical_significance"] == "Pathogenic"

def test_search_variant_normalization():
    response = client.get("/api/variants/search?q=BRAF%20V600E")
    assert response.status_code == 200
    data = response.json()
    assert data["variant"]["gene_symbol"] == "BRAF"
    assert data["variant"]["wild_type_aa"] == "V"
    assert data["variant"]["mutant_aa"] == "E"

def test_model_metadata_transparency():
    response = client.get("/api/model/metadata")
    assert response.status_code == 200
    data = response.json()
    # Ensure transparency: verified model trained in Phase 4
    assert data["is_trained"] is True
    assert data["status"] == "production_ready"
    assert "xgboost" in data["oof_evaluation_metrics"]
    assert len(data["leakage_safeguards"]) > 0
