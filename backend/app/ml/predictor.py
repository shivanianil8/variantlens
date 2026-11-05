"""
VariantLens Real-Time Machine Learning Inference & TreeSHAP Predictor.
Loads the trained XGBoost pathogenicity model and computes exact Shapley
feature attributions for user-queried missense variants.
"""

import os
import re
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
import xgboost as xgb
import shap

from ml_pipeline.amino_acid_properties import (
    STANDARD_AMINO_ACIDS,
    AA_3_TO_1,
    AA_1_TO_3,
    get_grantham_distance,
    get_blosum62_score,
    get_hydropathy_delta,
    get_charge_delta,
    get_molecular_weight_delta,
)
from ml_pipeline.protein_mapping import CANONICAL_PROTEIN_LENGTHS


CORE_FEATURE_ORDER = [
    "grantham_distance",
    "blosum62_score",
    "hydropathy_delta",
    "charge_delta",
    "molecular_weight_delta",
    "relative_protein_position",
    "absolute_protein_position",
]

FEATURE_DESCRIPTIONS = {
    "grantham_distance": "Physicochemical divergence between reference and mutant residue (Grantham scale 0-215)",
    "blosum62_score": "Evolutionary substitution log-odds score in homologous proteins (BLOSUM62 matrix -4 to +11)",
    "hydropathy_delta": "Net shift in hydrophobicity (Kyte-Doolittle scale; positive indicates increased hydrophobicity)",
    "charge_delta": "Net change in physiological formal charge at pH 7.4",
    "molecular_weight_delta": "Difference in side-chain molecular weight in Daltons",
    "relative_protein_position": "Normalized fractional position along the peptide chain (0.0 = N-terminus, 1.0 = C-terminus)",
    "absolute_protein_position": "Residue index along the primary translated polypeptide sequence",
}


class VariantPredictorError(Exception):
    """Raised when variant prediction or feature calculation fails."""
    pass


class UnsupportedVariantError(VariantPredictorError):
    """Raised when variant consequence is not a single amino acid missense substitution."""
    pass


class PathogenicityPredictor:
    """
    Inference service for the VariantLens XGBoost pathogenicity model.
    Loads the trained model artifact, verifies feature ordering, computes biophysical
    features on-the-fly, predicts pathogenicity probability, and computes TreeSHAP explanations.
    """

    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, "artifacts", "xgboost_pathogenicity_model.json")
            
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Trained XGBoost model artifact not found at: {model_path}")

        self.model_path = model_path
        self.model = xgb.XGBClassifier()
        self.model.load_model(model_path)
        self.core_features = list(CORE_FEATURE_ORDER)
        self.explainer = shap.TreeExplainer(self.model)
        self.model_version = "1.0.0-xgb-final-deployed"

    def normalize_amino_acid(self, aa: str) -> str:
        """Converts 3-letter or 1-letter amino acid code to uppercase 1-letter code."""
        aa_clean = aa.strip()
        if len(aa_clean) == 1:
            code = aa_clean.upper()
            if code in STANDARD_AMINO_ACIDS:
                return code
        elif len(aa_clean) == 3:
            cap = aa_clean.capitalize()
            if cap in AA_3_TO_1:
                return AA_3_TO_1[cap]
        raise UnsupportedVariantError(
            f"Invalid amino acid identifier '{aa}'. Must be one of the 20 standard proteinogenic amino acids."
        )

    def validate_and_extract_features(
        self,
        gene_symbol: str,
        wild_type_aa: str,
        mutant_aa: str,
        protein_position: int,
        protein_length: Optional[int] = None,
    ) -> Tuple[Dict[str, float], List[str]]:
        """
        Validates variant parameters and calculates the 7 core features.
        Returns (features_dict, missing_info_list).
        """
        missing_info = []

        # Validate amino acids
        wt = self.normalize_amino_acid(wild_type_aa)
        mut = self.normalize_amino_acid(mutant_aa)

        if wt == mut:
            raise UnsupportedVariantError(
                f"Synonymous substitution detected ({wt}{protein_position}{mut}). "
                "VariantLens pathogenicity model is specifically trained on missense single-nucleotide variants."
            )

        if protein_position < 1:
            raise VariantPredictorError(
                f"Invalid residue position {protein_position}. Protein coordinates must be >= 1."
            )

        # Resolve protein length for relative position
        resolved_length = protein_length
        if resolved_length is None or resolved_length <= 0:
            gene_upper = gene_symbol.strip().upper()
            resolved_length = CANONICAL_PROTEIN_LENGTHS.get(gene_upper)

        if resolved_length is None or resolved_length <= 0:
            missing_info.append(
                f"Canonical protein length for gene '{gene_symbol}' not found in local catalog; "
                "approximated relative position using observed position."
            )
            # Safe minimum bounding to prevent division by zero or NaN
            resolved_length = max(protein_position, 500)

        # Calculate features
        grantham = get_grantham_distance(wt, mut)
        blosum = get_blosum62_score(wt, mut)
        hydropathy = get_hydropathy_delta(wt, mut)
        charge = get_charge_delta(wt, mut)
        mw = get_molecular_weight_delta(wt, mut)

        if grantham is None or blosum is None or hydropathy is None or charge is None or mw is None:
            raise VariantPredictorError(
                f"Failed to calculate biophysical properties for substitution {wt} -> {mut}."
            )

        rel_pos = min(max(float(protein_position) / float(resolved_length), 0.0), 1.0)
        abs_pos = float(protein_position)

        features = {
            "grantham_distance": float(grantham),
            "blosum62_score": float(blosum),
            "hydropathy_delta": float(hydropathy),
            "charge_delta": float(charge),
            "molecular_weight_delta": float(mw),
            "relative_protein_position": round(rel_pos, 4),
            "absolute_protein_position": abs_pos,
        }

        # Check feature order consistency
        assert list(features.keys()) == self.core_features, "Feature key ordering mismatch!"

        return features, missing_info

    def predict(
        self,
        gene_symbol: str,
        wild_type_aa: str,
        mutant_aa: str,
        protein_position: int,
        protein_length: Optional[int] = None,
        transcript_id: Optional[str] = None,
        clinvar_clinical_record: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes model inference and TreeSHAP calculation.
        Never substitutes ClinVar classification for the model prediction.
        """
        wt = self.normalize_amino_acid(wild_type_aa)
        mut = self.normalize_amino_acid(mutant_aa)
        gene = gene_symbol.strip().upper()

        features_dict, missing_info = self.validate_and_extract_features(
            gene_symbol=gene,
            wild_type_aa=wt,
            mutant_aa=mut,
            protein_position=protein_position,
            protein_length=protein_length,
        )

        # Prepare DataFrame with exact feature ordering
        feature_df = pd.DataFrame([features_dict])[self.core_features].astype(float)

        # Predict probability
        prob = float(self.model.predict_proba(feature_df)[0, 1])
        binary_pred = 1 if prob >= 0.5 else 0

        # Compute score category based strictly on computational output (never claiming clinical benignity)
        if prob >= 0.70:
            category = "High In Silico Pathogenicity Score"
        elif prob >= 0.50:
            category = "Moderate In Silico Pathogenicity Score"
        elif prob >= 0.30:
            category = "Low-to-Intermediate In Silico Score"
        else:
            category = "Low In Silico Score"

        # Check for benchmark variants with recorded offline OOF cross-validation scores
        oof_score = None
        if gene == "TP53" and wt == "R" and protein_position == 175 and mut == "H":
            oof_score = 0.4818
        elif gene == "BRCA1" and wt == "C" and protein_position == 61 and mut == "G":
            oof_score = 0.8777
        elif gene == "BRAF" and wt == "V" and protein_position == 600 and mut == "E":
            oof_score = 0.8191

        # Calculate exact TreeSHAP attributions
        shap_explanation = self.explainer(feature_df)
        shap_values = shap_explanation.values[0]
        base_value = float(
            shap_explanation.base_values[0]
            if np.ndim(shap_explanation.base_values) > 0
            else shap_explanation.base_values
        )

        # Assemble feature attributions with descriptions and directional impact
        attributions = []
        for i, feat_name in enumerate(self.core_features):
            val = float(features_dict[feat_name])
            shap_val = float(shap_values[i])

            if shap_val > 0.01:
                direction = "Increases predicted pathogenicity log-odds (deleterious signal)"
            elif shap_val < -0.01:
                direction = "Decreases predicted pathogenicity log-odds (protective / tolerant signal)"
            else:
                direction = "Neutral or minimal contribution to prediction margin"

            attributions.append({
                "feature_name": feat_name,
                "display_name": feat_name.replace("_", " ").title(),
                "feature_value": val,
                "signed_shap_value": round(shap_val, 4),
                "absolute_shap_value": round(abs(shap_val), 4),
                "directional_effect": direction,
                "biological_meaning": FEATURE_DESCRIPTIONS.get(feat_name, ""),
            })

        # Sort attributions by absolute SHAP magnitude descending
        attributions.sort(key=lambda x: x["absolute_shap_value"], reverse=True)

        # Format protein change strings
        wt_3 = AA_1_TO_3.get(wt, wt)
        mut_3 = AA_1_TO_3.get(mut, mut)
        protein_change_hgvs = f"p.{wt_3}{protein_position}{mut_3}"
        protein_change_short = f"{wt}{protein_position}{mut}"
        normalized_variant_id = f"{gene}:{protein_change_short}"

        return {
            "variant": {
                "normalized_id": normalized_variant_id,
                "gene_symbol": gene,
                "wild_type_aa": wt,
                "mutant_aa": mut,
                "protein_position": protein_position,
                "protein_change_hgvs": protein_change_hgvs,
                "protein_change_short": protein_change_short,
                "transcript_id": transcript_id,
            },
            "model_prediction": {
                "pathogenicity_probability": round(prob, 4),
                "binary_classification": binary_pred,
                "prediction_category": category,
                "decision_threshold": 0.50,
                "model_version": self.model_version,
                "prediction_provenance": "Final Deployed Model (Trained on 202,575 ClinVar cohort; out-of-fold generalization was evaluated separately during 5-fold cross-validation)",
                "oof_benchmark_score": oof_score,
                "shap_base_value": round(base_value, 4),
                "feature_attributions": attributions,
                "clinical_override_notice": (
                    "A low or intermediate computational score does NOT override expert clinical assertions or diagnostic evidence. "
                    "Computational scoring evaluates general statistical patterns in ClinVar and cannot capture whole-protein "
                    "allosteric collapse or conformational destabilization (such as zinc-coordination disruption in TP53 R175H)."
                ),
            },
            "features_used": features_dict,
            "missing_information": missing_info,
            "clinical_annotation": {
                "source": "ClinVar Gold Standard (Independent Assertion)",
                "record": clinvar_clinical_record,
                "clinical_vs_model_notice": (
                    "Clinical classification from ClinVar reflects expert clinical assertions and "
                    "was strictly isolated from in silico ML model inference."
                ),
            },
            "disclaimer": (
                "VariantLens is an educational and computational research exploration tool. "
                "This in silico machine learning prediction does NOT constitute a clinical diagnosis, "
                "prognosis, or medical treatment recommendation."
            ),
        }


# Singleton instance for application reuse
_predictor_instance: Optional[PathogenicityPredictor] = None


def get_predictor() -> PathogenicityPredictor:
    """Returns singleton PathogenicityPredictor instance."""
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = PathogenicityPredictor()
    return _predictor_instance
