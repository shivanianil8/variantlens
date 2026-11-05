"""
Amino Acid Properties & Substitution Metrics Module for VariantLens.
Implements the canonical Grantham Distance matrix (Grantham 1974),
BLOSUM62 evolutionary substitution log-odds matrix (Henikoff & Henikoff 1992),
Kyte-Doolittle hydropathy scale (1982), formal physiological charge (pH 7.4),
molecular weight in Daltons, and isoelectric points (pI).
"""

from typing import Dict, Tuple, Optional
from Bio.Align import substitution_matrices

# Standard 20 proteinogenic amino acids
STANDARD_AMINO_ACIDS = set("ACDEFGHIKLMNPQRSTVWY")

# 3-letter to 1-letter mapping
AA_3_TO_1 = {
    'Ala': 'A', 'Arg': 'R', 'Asn': 'N', 'Asp': 'D', 'Cys': 'C',
    'Gln': 'Q', 'Glu': 'E', 'Gly': 'G', 'His': 'H', 'Ile': 'I',
    'Leu': 'L', 'Lys': 'K', 'Met': 'M', 'Phe': 'F', 'Pro': 'P',
    'Ser': 'S', 'Thr': 'T', 'Trp': 'W', 'Tyr': 'Y', 'Val': 'V'
}

AA_1_TO_3 = {v: k for k, v in AA_3_TO_1.items()}

# Kyte-Doolittle Hydropathy scale (J. Mol. Biol. 1982, 157:105-132)
KYTE_DOOLITTLE: Dict[str, float] = {
    'I': 4.5, 'V': 4.2, 'L': 3.8, 'F': 2.8, 'C': 2.5,
    'M': 1.9, 'A': 1.8, 'G': -0.4, 'T': -0.7, 'S': -0.8,
    'W': -0.9, 'Y': -1.3, 'P': -1.6, 'H': -3.2, 'E': -3.5,
    'Q': -3.5, 'D': -3.5, 'N': -3.5, 'K': -3.9, 'R': -4.5
}

# Formal charge at physiological pH (~7.4)
AA_CHARGE: Dict[str, float] = {
    'R': 1.0, 'K': 1.0, 'H': 0.1,  # Basic / positively charged
    'D': -1.0, 'E': -1.0,          # Acidic / negatively charged
    'A': 0.0, 'N': 0.0, 'C': 0.0, 'Q': 0.0, 'G': 0.0,
    'I': 0.0, 'L': 0.0, 'M': 0.0, 'F': 0.0, 'P': 0.0,
    'S': 0.0, 'T': 0.0, 'W': 0.0, 'Y': 0.0, 'V': 0.0
}

# Molecular weights in Daltons
AA_MOLECULAR_WEIGHT: Dict[str, float] = {
    'A': 89.09, 'R': 174.20, 'N': 132.12, 'D': 133.10, 'C': 121.16,
    'E': 147.13, 'Q': 146.15, 'G': 75.07, 'H': 155.16, 'I': 131.17,
    'L': 131.17, 'K': 146.19, 'M': 149.21, 'F': 165.19, 'P': 115.13,
    'S': 105.09, 'T': 119.12, 'W': 204.23, 'Y': 181.19, 'V': 117.15
}

# Isoelectric points (pI)
AA_PI: Dict[str, float] = {
    'A': 6.00, 'R': 10.76, 'N': 5.41, 'D': 2.77, 'C': 5.07,
    'E': 3.22, 'Q': 5.65, 'G': 5.97, 'H': 7.59, 'I': 6.02,
    'L': 5.98, 'K': 9.74, 'M': 5.74, 'F': 5.48, 'P': 6.30,
    'S': 5.68, 'T': 5.60, 'W': 5.89, 'Y': 5.66, 'V': 5.96
}

# Grantham Distance Matrix (Grantham R., Science 1974, 185(4154):862-864)
# Symmetric 20x20 distance matrix
_GRANTHAM_DATA: Dict[Tuple[str, str], int] = {
    ('A', 'A'): 0, ('A', 'R'): 112, ('A', 'N'): 111, ('A', 'D'): 126, ('A', 'C'): 195,
    ('A', 'Q'): 91, ('A', 'E'): 107, ('A', 'G'): 60, ('A', 'H'): 86, ('A', 'I'): 94,
    ('A', 'L'): 96, ('A', 'K'): 106, ('A', 'M'): 84, ('A', 'F'): 113, ('A', 'P'): 27,
    ('A', 'S'): 99, ('A', 'T'): 58, ('A', 'W'): 148, ('A', 'Y'): 112, ('A', 'V'): 64,

    ('R', 'R'): 0, ('R', 'N'): 86, ('R', 'D'): 96, ('R', 'C'): 180, ('R', 'Q'): 43,
    ('R', 'E'): 54, ('R', 'G'): 125, ('R', 'H'): 29, ('R', 'I'): 97, ('R', 'L'): 102,
    ('R', 'K'): 26, ('R', 'M'): 91, ('R', 'F'): 97, ('R', 'P'): 103, ('R', 'S'): 110,
    ('R', 'T'): 71, ('R', 'W'): 101, ('R', 'Y'): 77, ('R', 'V'): 96,

    ('N', 'N'): 0, ('N', 'D'): 23, ('N', 'C'): 139, ('N', 'Q'): 46, ('N', 'E'): 42,
    ('N', 'G'): 80, ('N', 'H'): 68, ('N', 'I'): 149, ('N', 'L'): 153, ('N', 'K'): 94,
    ('N', 'M'): 142, ('N', 'F'): 158, ('N', 'P'): 91, ('N', 'S'): 46, ('N', 'T'): 65,
    ('N', 'W'): 174, ('N', 'Y'): 143, ('N', 'V'): 133,

    ('D', 'D'): 0, ('D', 'C'): 154, ('D', 'Q'): 61, ('D', 'E'): 45, ('D', 'G'): 94,
    ('D', 'H'): 81, ('D', 'I'): 168, ('D', 'L'): 172, ('D', 'K'): 101, ('D', 'M'): 160,
    ('D', 'F'): 177, ('D', 'P'): 108, ('D', 'S'): 65, ('D', 'T'): 85, ('D', 'W'): 181,
    ('D', 'Y'): 160, ('D', 'V'): 152,

    ('C', 'C'): 0, ('C', 'Q'): 154, ('C', 'E'): 170, ('C', 'G'): 159, ('C', 'H'): 174,
    ('C', 'I'): 198, ('C', 'L'): 198, ('C', 'K'): 202, ('C', 'M'): 196, ('C', 'F'): 205,
    ('C', 'P'): 169, ('C', 'S'): 112, ('C', 'T'): 149, ('C', 'W'): 215, ('C', 'Y'): 194,
    ('C', 'V'): 192,

    ('Q', 'Q'): 0, ('Q', 'E'): 29, ('Q', 'G'): 87, ('Q', 'H'): 24, ('Q', 'I'): 109,
    ('Q', 'L'): 113, ('Q', 'K'): 53, ('Q', 'M'): 101, ('Q', 'F'): 116, ('Q', 'P'): 76,
    ('Q', 'S'): 68, ('Q', 'T'): 42, ('Q', 'W'): 130, ('Q', 'Y'): 99, ('Q', 'V'): 96,

    ('E', 'E'): 0, ('E', 'G'): 98, ('E', 'H'): 40, ('E', 'I'): 134, ('E', 'L'): 138,
    ('E', 'K'): 56, ('E', 'M'): 126, ('E', 'F'): 140, ('E', 'P'): 93, ('E', 'S'): 80,
    ('E', 'T'): 65, ('E', 'W'): 152, ('E', 'Y'): 122, ('E', 'V'): 121,

    ('G', 'G'): 0, ('G', 'H'): 89, ('G', 'I'): 135, ('G', 'L'): 138, ('G', 'K'): 127,
    ('G', 'M'): 127, ('G', 'F'): 153, ('G', 'P'): 42, ('G', 'S'): 56, ('G', 'T'): 59,
    ('G', 'W'): 184, ('G', 'Y'): 147, ('G', 'V'): 109,

    ('H', 'H'): 0, ('H', 'I'): 94, ('H', 'L'): 99, ('H', 'K'): 32, ('H', 'M'): 87,
    ('H', 'F'): 100, ('H', 'P'): 77, ('H', 'S'): 89, ('H', 'T'): 47, ('H', 'W'): 115,
    ('H', 'Y'): 83, ('H', 'V'): 84,

    ('I', 'I'): 0, ('I', 'L'): 5, ('I', 'K'): 102, ('I', 'M'): 10, ('I', 'F'): 21,
    ('I', 'P'): 95, ('I', 'S'): 142, ('I', 'T'): 89, ('I', 'W'): 61, ('I', 'Y'): 33,
    ('I', 'V'): 29,

    ('L', 'L'): 0, ('L', 'K'): 107, ('L', 'M'): 15, ('L', 'F'): 22, ('L', 'P'): 98,
    ('L', 'S'): 145, ('L', 'T'): 92, ('L', 'W'): 61, ('L', 'Y'): 36, ('L', 'V'): 32,

    ('K', 'K'): 0, ('K', 'M'): 95, ('K', 'F'): 102, ('K', 'P'): 103, ('K', 'S'): 121,
    ('K', 'T'): 78, ('K', 'W'): 110, ('K', 'Y'): 85, ('K', 'V'): 97,

    ('M', 'M'): 0, ('M', 'F'): 28, ('M', 'P'): 87, ('M', 'S'): 135, ('M', 'T'): 81,
    ('M', 'W'): 67, ('M', 'Y'): 36, ('M', 'V'): 21,

    ('F', 'F'): 0, ('F', 'P'): 114, ('F', 'S'): 155, ('F', 'T'): 103, ('F', 'W'): 40,
    ('F', 'Y'): 22, ('F', 'V'): 50,

    ('P', 'P'): 0, ('P', 'S'): 74, ('P', 'T'): 38, ('P', 'W'): 147, ('P', 'Y'): 110,
    ('P', 'V'): 68,

    ('S', 'S'): 0, ('S', 'T'): 58, ('S', 'W'): 177, ('S', 'Y'): 144, ('S', 'V'): 124,

    ('T', 'T'): 0, ('T', 'W'): 128, ('T', 'Y'): 92, ('T', 'V'): 69,

    ('W', 'W'): 0, ('W', 'Y'): 37, ('W', 'V'): 88,

    ('Y', 'Y'): 0, ('Y', 'V'): 55,

    ('V', 'V'): 0
}

# Build full symmetric Grantham lookup
GRANTHAM_MATRIX: Dict[Tuple[str, str], int] = {}
for (aa1, aa2), val in _GRANTHAM_DATA.items():
    GRANTHAM_MATRIX[(aa1, aa2)] = val
    GRANTHAM_MATRIX[(aa2, aa1)] = val

# Load official Biopython BLOSUM62 matrix
_BIO_BLOSUM62 = substitution_matrices.load("BLOSUM62")

def get_grantham_distance(wt: str, mut: str) -> Optional[int]:
    """Returns Grantham chemical distance (5 to 215) for standard amino acid pair."""
    wt_clean = wt.strip().upper()
    mut_clean = mut.strip().upper()
    if wt_clean not in STANDARD_AMINO_ACIDS or mut_clean not in STANDARD_AMINO_ACIDS:
        return None
    return GRANTHAM_MATRIX.get((wt_clean, mut_clean))

def get_blosum62_score(wt: str, mut: str) -> Optional[int]:
    """Returns BLOSUM62 evolutionary substitution log-odds score (-4 to +11)."""
    wt_clean = wt.strip().upper()
    mut_clean = mut.strip().upper()
    if wt_clean not in STANDARD_AMINO_ACIDS or mut_clean not in STANDARD_AMINO_ACIDS:
        return None
    try:
        return int(_BIO_BLOSUM62[wt_clean, mut_clean])
    except KeyError:
        return None

def get_hydropathy_delta(wt: str, mut: str) -> Optional[float]:
    """Calculates Kyte-Doolittle hydropathy shift: Delta = Hydropathy(mut) - Hydropathy(wt)."""
    wt_clean = wt.strip().upper()
    mut_clean = mut.strip().upper()
    if wt_clean not in STANDARD_AMINO_ACIDS or mut_clean not in STANDARD_AMINO_ACIDS:
        return None
    return round(KYTE_DOOLITTLE[mut_clean] - KYTE_DOOLITTLE[wt_clean], 2)

def get_charge_delta(wt: str, mut: str) -> Optional[float]:
    """Calculates formal physiological charge shift (pH ~7.4): Delta = Charge(mut) - Charge(wt)."""
    wt_clean = wt.strip().upper()
    mut_clean = mut.strip().upper()
    if wt_clean not in STANDARD_AMINO_ACIDS or mut_clean not in STANDARD_AMINO_ACIDS:
        return None
    return round(AA_CHARGE[mut_clean] - AA_CHARGE[wt_clean], 2)

def get_molecular_weight_delta(wt: str, mut: str) -> Optional[float]:
    """Calculates molecular weight delta in Daltons: Delta = MW(mut) - MW(wt)."""
    wt_clean = wt.strip().upper()
    mut_clean = mut.strip().upper()
    if wt_clean not in STANDARD_AMINO_ACIDS or mut_clean not in STANDARD_AMINO_ACIDS:
        return None
    return round(AA_MOLECULAR_WEIGHT[mut_clean] - AA_MOLECULAR_WEIGHT[wt_clean], 2)

def get_pi_delta(wt: str, mut: str) -> Optional[float]:
    """Calculates isoelectric point shift: Delta = pI(mut) - pI(wt)."""
    wt_clean = wt.strip().upper()
    mut_clean = mut.strip().upper()
    if wt_clean not in STANDARD_AMINO_ACIDS or mut_clean not in STANDARD_AMINO_ACIDS:
        return None
    return round(AA_PI[mut_clean] - AA_PI[wt_clean], 2)
