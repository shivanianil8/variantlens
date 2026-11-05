"""
Automated Unit Tests for Biological Feature Engineering.
Validates standard amino acid scales, Grantham symmetry, BLOSUM62 lookups,
position normalization, invalid residue handling, and missingness semantics.
"""

import math
import numpy as np
import pytest
from ml_pipeline.amino_acid_properties import (
    STANDARD_AMINO_ACIDS,
    GRANTHAM_MATRIX,
    get_grantham_distance,
    get_blosum62_score,
    get_hydropathy_delta,
    get_charge_delta,
    get_molecular_weight_delta,
    KYTE_DOOLITTLE,
    AA_CHARGE,
    AA_MOLECULAR_WEIGHT
)
from ml_pipeline.protein_mapping import (
    validate_protein_residue,
    compute_relative_position,
    extract_transcript_id,
    build_overlapping_gene_groups
)
from ml_pipeline.population_features import (
    GnomadState,
    encode_gnomad_frequency
)

def test_all_20_standard_amino_acids_present():
    """Verifies that all 20 standard amino acids are fully populated in all scales."""
    assert len(STANDARD_AMINO_ACIDS) == 20
    for aa in STANDARD_AMINO_ACIDS:
        assert aa in KYTE_DOOLITTLE, f"Missing {aa} in Kyte-Doolittle"
        assert aa in AA_CHARGE, f"Missing {aa} in AA_CHARGE"
        assert aa in AA_MOLECULAR_WEIGHT, f"Missing {aa} in AA_MOLECULAR_WEIGHT"
        assert (aa, aa) in GRANTHAM_MATRIX, f"Missing ({aa}, {aa}) in Grantham"

def test_grantham_distance_symmetry_and_identity():
    """Verifies Grantham distance mathematical properties: D(A, B) == D(B, A) and D(A, A) == 0."""
    amino_acids = list(STANDARD_AMINO_ACIDS)
    for aa1 in amino_acids:
        assert get_grantham_distance(aa1, aa1) == 0, f"Identity fail for {aa1}"
        for aa2 in amino_acids:
            d1 = get_grantham_distance(aa1, aa2)
            d2 = get_grantham_distance(aa2, aa1)
            assert d1 is not None and d2 is not None
            assert d1 == d2, f"Grantham symmetry violation: {aa1}->{aa2} ({d1}) != {aa2}->{aa1} ({d2})"
            assert 0 <= d1 <= 215, f"Grantham distance out of bounds: {d1}"

    # Known canonical benchmark values from Grantham (1974)
    assert get_grantham_distance('C', 'W') == 215 # Max distance
    assert get_grantham_distance('I', 'L') == 5   # Min non-zero distance
    assert get_grantham_distance('V', 'E') == 121 # BRAF V600E substitution
    assert get_grantham_distance('R', 'H') == 29  # TP53 R175H substitution

def test_blosum62_lookup_symmetry_and_values():
    """Verifies BLOSUM62 substitution matrix symmetry and known values."""
    amino_acids = list(STANDARD_AMINO_ACIDS)
    for aa1 in amino_acids:
        s_self = get_blosum62_score(aa1, aa1)
        assert s_self is not None and s_self > 0, f"Diagonal self-score must be positive: {aa1}"
        for aa2 in amino_acids:
            s1 = get_blosum62_score(aa1, aa2)
            s2 = get_blosum62_score(aa2, aa1)
            assert s1 == s2, f"BLOSUM62 symmetry violation: {aa1}-{aa2}"

    # Benchmark known substitutions
    assert get_blosum62_score('C', 'C') == 9
    assert get_blosum62_score('W', 'W') == 11
    assert get_blosum62_score('V', 'E') == -2
    assert get_blosum62_score('R', 'H') == 0

def test_physicochemical_deltas():
    """Verifies delta calculations for known mutations."""
    # BRAF V600E: Val (hydrophobic 4.2, charge 0.0, MW 117.15) -> Glu (hydrophilic -3.5, charge -1.0, MW 147.13)
    hydr = get_hydropathy_delta('V', 'E')
    assert hydr == -7.7 # -3.5 - 4.2
    chg = get_charge_delta('V', 'E')
    assert chg == -1.0
    mw = get_molecular_weight_delta('V', 'E')
    assert mw == 29.98 # 147.13 - 117.15

def test_protein_position_calculations():
    """Verifies relative position is properly bounded in (0, 1]."""
    # BRAF length is 766; position 600
    rel_pos = compute_relative_position('BRAF', 600)
    assert rel_pos is not None
    assert 0.0 < rel_pos <= 1.0
    assert abs(rel_pos - (600 / 766)) < 0.001

    # Position at boundary
    rel_pos_1 = compute_relative_position('BRAF', 1)
    assert 0.0 < rel_pos_1 <= 1.0

def test_invalid_residue_handling():
    """Verifies rejection of invalid amino acids, stop codons, and synonymous mutations."""
    # Unknown amino acid
    is_valid, reason = validate_protein_residue('X', 'A', 100)
    assert not is_valid
    assert "Invalid wild-type" in reason

    # Stop codon
    is_valid, reason = validate_protein_residue('*', 'A', 100)
    assert not is_valid

    # Synonymous substitution
    is_valid, reason = validate_protein_residue('A', 'A', 100)
    assert not is_valid
    assert "Synonymous" in reason

    # Non-positive position
    is_valid, reason = validate_protein_residue('A', 'V', 0)
    assert not is_valid
    assert "Non-positive" in reason

    # Grantham with invalid AA
    assert get_grantham_distance('X', 'A') is None
    assert get_blosum62_score('*', 'A') is None

def test_gnomad_missingness_semantics():
    """Verifies that missing or unobserved gnomAD frequency is NEVER converted to zero."""
    # Observed variant
    st, is_obs, cov, log_af = encode_gnomad_frequency(af=0.001)
    assert st == GnomadState.OBSERVED
    assert is_obs == 1
    assert cov == 1
    assert log_af == -3.0

    # High-depth unobserved variant (State 2)
    st, is_obs, cov, log_af = encode_gnomad_frequency(af=None, an=150000)
    assert st == GnomadState.NOT_OBSERVED
    assert is_obs == 0
    assert cov == 1
    assert math.isnan(log_af), "Unobserved AF must be NaN, NEVER 0!"

    # Insufficient coverage locus (State 3)
    st, is_obs, cov, log_af = encode_gnomad_frequency(af=None, an=5000)
    assert st == GnomadState.INSUFFICIENT_COVERAGE
    assert is_obs == 0
    assert cov == 0
    assert math.isnan(log_af), "Low depth AF must be NaN, NEVER 0!"

    # QC filtered locus (State 4)
    st, is_obs, cov, log_af = encode_gnomad_frequency(af=0.01, qc_passed=False)
    assert st == GnomadState.QC_FILTERED
    assert is_obs == 0
    assert math.isnan(log_af)

    # Unavailable annotation (State 5)
    st, is_obs, cov, log_af = encode_gnomad_frequency(af=None, an=None)
    assert st == GnomadState.UNAVAILABLE
    assert is_obs == 0
    assert math.isnan(log_af)

def test_transcript_extraction():
    """Verifies RefSeq NM_ and Ensembl ENST extraction."""
    nm = extract_transcript_id("NM_004333.6(BRAF):c.1799T>A (p.Val600Glu)")
    assert nm == "NM_004333.6"

    enst = extract_transcript_id("ENST00000288602.11(BRAF):c.1799T>A")
    assert enst == "ENST00000288602.11"

    assert extract_transcript_id("invalid_name") is None

def test_overlapping_gene_connected_components():
    """Verifies that overlapping genes form a unified connected component group."""
    genes = ["LDLR;MIR6886", "LDLR", "MIR6886", "TP53", "BRAF"]
    groups = build_overlapping_gene_groups(genes)

    # LDLR and MIR6886 must share the exact same group
    assert groups["LDLR"] == groups["LDLR;MIR6886"]
    assert groups["MIR6886"] == groups["LDLR;MIR6886"]

    # TP53 and BRAF must have distinct independent groups
    assert groups["TP53"] != groups["BRAF"]
    assert groups["TP53"] != groups["LDLR"]
