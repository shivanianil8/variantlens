"""
VariantLens Model Prediction and TreeSHAP Explainability API Routes.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any

from app.schemas.prediction_schema import (
    PredictRequest,
    PredictResponse,
    ResidueVerificationDetails,
    BiologicalContext,
)
from app.ml.predictor import (
    get_predictor,
    PathogenicityPredictor,
    UnsupportedVariantError,
    VariantPredictorError,
)
from app.services.clinvar_service import clinvar_service
from app.services.uniprot_service import uniprot_service
from app.services.alphafold_service import alphafold_service
from app.services.pubmed_service import pubmed_service

router = APIRouter(prefix="/predict", tags=["Prediction"])

# Curated reference wild-type residues for high-confidence canonical disease loci
KNOWN_CANONICAL_RESIDUES = {
    ("BRAF", 600): "V",
    ("TP53", 175): "R",
    ("TP53", 248): "R",
    ("TP53", 273): "R",
    ("BRCA1", 61): "C",
    ("BRCA1", 1775): "M",
    ("KRAS", 12): "G",
    ("KRAS", 13): "G",
    ("KRAS", 61): "Q",
    ("NRAS", 61): "Q",
    ("HRAS", 12): "G",
    ("PTEN", 130): "R",
    ("EGFR", 858): "L",
    ("EGFR", 790): "T",
    ("CFTR", 508): "F",
    ("CFTR", 551): "G",
    ("VHL", 167): "R",
}


@router.post("", response_model=PredictResponse)
async def predict_variant(
    req: PredictRequest,
    predictor: PathogenicityPredictor = Depends(get_predictor),
):
    """
    Predicts variant pathogenicity probability using the trained XGBoost model
    and computes exact TreeSHAP feature attributions.
    Retrieves independent ClinVar clinical annotations, UniProt identifiers,
    and AlphaFold 3D structural model URLs where available.
    Never substitutes ClinVar classifications for ML model predictions.
    """
    gene = req.gene_symbol.strip().upper()

    # 1. Resolve UniProt & Protein Length if missing
    protein_len = req.protein_length
    uniprot_data = await uniprot_service.get_protein_info(gene)
    if uniprot_data and (protein_len is None or protein_len <= 0):
        protein_len = uniprot_data.get("sequence_length")

    # 2. Query independent ClinVar clinical record
    clinvar_record = None
    if req.include_clinical:
        temp_hgvs = f"p.{req.wild_type_aa}{req.protein_position}{req.mutant_aa}"
        clinvar_record = await clinvar_service.get_variant_annotation(
            gene=gene,
            wild_type_aa=req.wild_type_aa,
            mutant_aa=req.mutant_aa,
            protein_position=req.protein_position,
            protein_change_hgvs=temp_hgvs,
        )

    # 3. Execute Model Inference & TreeSHAP Attributions
    try:
        prediction_result = predictor.predict(
            gene_symbol=gene,
            wild_type_aa=req.wild_type_aa,
            mutant_aa=req.mutant_aa,
            protein_position=req.protein_position,
            protein_length=protein_len,
            transcript_id=req.transcript_id,
            clinvar_clinical_record=clinvar_record,
        )
    except UnsupportedVariantError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except VariantPredictorError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal model inference failure: {str(e)}",
        )

    # 4. Strict Protein Residue Mapping Verification
    norm_wt = predictor.normalize_amino_acid(req.wild_type_aa)
    is_verified = False
    expected_wt = None
    warning_msg = None
    mapping_status = "Unverified"

    if protein_len and req.protein_position > protein_len:
        is_verified = False
        mapping_status = "Out of Sequence Bounds"
        warning_msg = (
            f"Residue position #{req.protein_position} exceeds canonical sequence length "
            f"of {protein_len} amino acids for {gene}. Structural highlighting disabled."
        )
    elif (gene, req.protein_position) in KNOWN_CANONICAL_RESIDUES:
        expected_wt = KNOWN_CANONICAL_RESIDUES[(gene, req.protein_position)]
        if expected_wt == norm_wt:
            is_verified = True
            mapping_status = "Verified Match against Canonical Sequence"
            warning_msg = None
        else:
            is_verified = False
            mapping_status = "Residue Mismatch"
            warning_msg = (
                f"Canonical Swiss-Prot reference sequence has '{expected_wt}' at residue #{req.protein_position}, "
                f"but query specified '{norm_wt}'. This coordinate may derive from an alternative transcript isoform "
                f"or reading frame offset. Highlighting disabled."
            )
    else:
        # Check against live sequence string if returned by UniProt
        seq_str = uniprot_data.get("sequence_str") if uniprot_data else None
        if seq_str and 0 <= req.protein_position - 1 < len(seq_str):
            expected_wt = seq_str[req.protein_position - 1]
            if expected_wt == norm_wt:
                is_verified = True
                mapping_status = "Verified Match against Live UniProt Sequence"
                warning_msg = None
            else:
                is_verified = False
                mapping_status = "Sequence Residue Mismatch"
                warning_msg = (
                    f"Live UniProt sequence has '{expected_wt}' at residue #{req.protein_position}, "
                    f"but query provided '{norm_wt}'. Coordinate offset detected."
                )
        elif protein_len and req.protein_position <= protein_len:
            # Within bounds, but exact wild-type identity not in local catalog
            is_verified = True
            mapping_status = "Within Sequence Length (Residue Identity Plausible)"
            warning_msg = None
        else:
            is_verified = False
            mapping_status = "Unverified Mapping"
            warning_msg = "Amino acid identity could not be verified against translated sequence."

    residue_verif = ResidueVerificationDetails(
        is_verified=is_verified,
        expected_wild_type=expected_wt,
        observed_wild_type=norm_wt,
        position=req.protein_position,
        sequence_length=protein_len,
        status=mapping_status,
        warning_message=warning_msg,
    )

    # 5. Resolve AlphaFold 3D Structural Links
    biological_context = None
    if uniprot_data:
        accession = uniprot_data.get("uniprot_accession")
        af_data = await alphafold_service.get_structure_info(accession) if accession else None
        biological_context = BiologicalContext(
            gene_symbol=gene,
            uniprot_accession=accession,
            protein_name=uniprot_data.get("protein_name"),
            sequence_length=protein_len,
            residue_verification=residue_verif,
            alphafold=af_data,
        )

    # 6. Retrieve PubMed citations if requested
    citations = None
    if req.include_citations:
        variant_str = f"{req.wild_type_aa}{req.protein_position}{req.mutant_aa}"
        citations = await pubmed_service.search_citations(gene, variant_str, max_results=5)

    return PredictResponse(
        variant=prediction_result["variant"],
        model_prediction=prediction_result["model_prediction"],
        features_used=prediction_result["features_used"],
        missing_information=prediction_result["missing_information"],
        clinical_annotation=prediction_result["clinical_annotation"],
        biological_context=biological_context,
        citations=citations,
        disclaimer=prediction_result["disclaimer"],
    )
