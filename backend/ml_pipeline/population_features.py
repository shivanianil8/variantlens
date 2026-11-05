"""
Population Genetics & Frequency Modeling Module for VariantLens.
Implements the 5 gnomAD availability states, prevents false zero-imputation,
and maintains explicit missingness indicators.
"""

import math
from typing import Optional, Tuple
import numpy as np

class GnomadState:
    OBSERVED = "OBSERVED"                           # Empirical alternate allele observed (AF > 0)
    NOT_OBSERVED = "NOT_OBSERVED"                   # High-depth locus (>= 20x, AN >= 100k), 0 alt alleles
    INSUFFICIENT_COVERAGE = "INSUFFICIENT_COVERAGE" # Low read depth (< 10x, AN < 20k)
    QC_FILTERED = "QC_FILTERED"                     # Failed site-level quality filters
    UNAVAILABLE = "UNAVAILABLE"                     # Annotation not yet queried / uncataloged

def encode_gnomad_frequency(
    af: Optional[float],
    ac: Optional[int] = None,
    an: Optional[int] = None,
    qc_passed: bool = True
) -> Tuple[str, int, int, float]:
    """
    Encodes gnomAD population features according to the 5 availability states:
    Returns (gnomad_state, is_observed_in_gnomad, gnomad_coverage_adequate, gnomad_log10_af)
    
    CRITICAL RULE: Never converts missing or unobserved AF to zero!
    If unobserved or unavailable, gnomad_log10_af is returned as np.nan.
    """
    if not qc_passed:
        # State 4: QC Filtered
        return GnomadState.QC_FILTERED, 0, 0, np.nan

    if af is not None and not math.isnan(af) and af > 0:
        # State 1: Observed
        log_af = round(math.log10(max(af, 1e-7)), 4)
        return GnomadState.OBSERVED, 1, 1, log_af

    if an is not None:
        if an >= 100000:
            # State 2: High depth, variant not observed
            return GnomadState.NOT_OBSERVED, 0, 1, np.nan
        elif an < 20000:
            # State 3: Insufficient coverage
            return GnomadState.INSUFFICIENT_COVERAGE, 0, 0, np.nan

    # State 5: Unavailable annotation
    return GnomadState.UNAVAILABLE, 0, 0, np.nan
