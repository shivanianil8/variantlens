"""
Transcript and Protein Mapping Module for VariantLens.
Implements canonical transcript selection, residue validation,
relative protein position normalization, and multi-gene connected component grouping.
"""

import re
from typing import Dict, Any, Tuple, Optional, Set, List
try:
    from ml_pipeline.amino_acid_properties import STANDARD_AMINO_ACIDS, AA_3_TO_1
except ImportError:
    from amino_acid_properties import STANDARD_AMINO_ACIDS, AA_3_TO_1

# Canonical human gene protein lengths (curated from UniProtKB/Swiss-Prot canonical isoforms)
# Common benchmark and clinically relevant genes, with fallback lengths for general proteome
CANONICAL_PROTEIN_LENGTHS: Dict[str, int] = {
    'BRAF': 766,
    'TP53': 393,
    'BRCA1': 1863,
    'BRCA2': 3418,
    'KRAS': 189,
    'NRAS': 189,
    'HRAS': 189,
    'EGFR': 1210,
    'PTEN': 403,
    'LDLR': 860,
    'CFTR': 1480,
    'FBN1': 2871,
    'TTN': 35991,
    'KMT2D': 5537,
    'SCN1A': 2009,
    'SCN5A': 2016,
    'DNAH11': 4516,
    'COL4A5': 1685,
    'COL2A1': 1487,
    'COL3A1': 1466,
    'COL1A2': 1366,
    'OBSCN': 7968,
    'ABCA4': 2273,
    'GLA': 429,
    'MYH7': 1935,
    'KCNQ1': 676,
    'KCNH2': 1159,
    'RYR2': 4967,
    'MSH2': 934,
    'MSH6': 1360,
    'MLH1': 756,
    'PMS2': 862,
    'APC': 2843,
    'VHL': 213,
    'RB1': 928,
    'CDKN2A': 156,
    'PALB2': 1186,
    'ATM': 3056,
    'CHEK2': 543,
    'NF1': 2818,
    'NF2': 595,
    'TSC1': 1164,
    'TSC2': 1807,
    'WT1': 517,
    'RET': 1114,
    'MET': 1390,
    'ALK': 1620,
    'PIK3CA': 1068,
    'AKT1': 480,
    'SMAD4': 552
}

# Gene to canonical UniProt accession mapping for top benchmark genes
GENE_TO_UNIPROT: Dict[str, str] = {
    'BRAF': 'P15056',
    'TP53': 'P04637',
    'BRCA1': 'P38398',
    'BRCA2': 'P51587',
    'KRAS': 'P01116',
    'NRAS': 'P01111',
    'HRAS': 'P01112',
    'EGFR': 'P00533',
    'PTEN': 'P60484',
    'LDLR': 'P01130',
    'CFTR': 'P13569',
    'FBN1': 'P35555',
    'TTN': 'Q8WZ42',
    'KMT2D': 'O14686',
    'SCN1A': 'P35498',
    'SCN5A': 'Q14524',
    'DNAH11': 'Q96M91',
    'COL4A5': 'P29400',
    'COL2A1': 'P02458',
    'COL3A1': 'P02461',
    'COL1A2': 'P08123',
    'OBSCN': 'Q5VST9',
    'ABCA4': 'P78363',
    'GLA': 'P06280',
    'MYH7': 'P12883',
    'KCNQ1': 'P51787',
    'KCNH2': 'Q12809',
    'RYR2': 'Q92736',
    'MSH2': 'P43246',
    'MSH6': 'P52701',
    'MLH1': 'P40692',
    'PMS2': 'P54278',
    'APC': 'P25054',
    'VHL': 'P40337',
    'RB1': 'P06400',
    'CDKN2A': 'P42771',
    'PALB2': 'Q86YC2',
    'ATM': 'Q13315',
    'CHEK2': 'O96017',
    'NF1': 'P21359',
    'NF2': 'P35240',
    'TSC1': 'Q92574',
    'TSC2': 'P49815',
    'WT1': 'P19544',
    'RET': 'P07949',
    'MET': 'P08581',
    'ALK': 'Q9UM73',
    'PIK3CA': 'P42336',
    'AKT1': 'P31749',
    'SMAD4': 'Q13485'
}

TRANSCRIPT_REGEX = re.compile(r"^(NM_\d+\.\d+|ENST\d+\.\d+)")

def extract_transcript_id(name: str) -> Optional[str]:
    """Extracts RefSeq NM_ or Ensembl ENST accession from ClinVar Name field."""
    if not name:
        return None
    m = TRANSCRIPT_REGEX.match(name.strip())
    if m:
        return m.group(1)
    return None

def validate_protein_residue(wt: str, mut: str, pos: int) -> Tuple[bool, Optional[str]]:
    """
    Validates protein residue substitution:
    1. wt and mut must be in standard 20 amino acids.
    2. wt != mut (not synonymous).
    3. pos must be an integer >= 1.
    Returns (is_valid, failure_reason).
    """
    if wt not in STANDARD_AMINO_ACIDS:
        return False, f"Invalid wild-type amino acid '{wt}'"
    if mut not in STANDARD_AMINO_ACIDS:
        return False, f"Invalid mutant amino acid '{mut}'"
    if wt == mut:
        return False, f"Synonymous substitution {wt}{pos}{mut}"
    if pos < 1:
        return False, f"Non-positive protein residue index {pos}"
    return True, None

def compute_relative_position(gene: str, pos: int, max_observed_pos: Optional[int] = None) -> Optional[float]:
    """
    Calculates relative position = pos / protein_length in range (0, 1].
    Uses canonical length if available, or max observed position in gene as empirical bound.
    """
    length = CANONICAL_PROTEIN_LENGTHS.get(gene)
    if length is None and max_observed_pos and max_observed_pos > 0:
        length = max_observed_pos

    if length is not None and length > 0:
        # Bound between (0.0, 1.0]
        rel_pos = min(max(pos / float(length), 0.0001), 1.0)
        return round(rel_pos, 4)
    return None

class DisjointSet:
    """Disjoint Set Union (Union-Find) for overlapping gene grouping."""
    def __init__(self):
        self.parent: Dict[str, str] = {}
        self.rank: Dict[str, int] = {}

    def find(self, x: str) -> str:
        if x not in self.parent:
            self.parent[x] = x
            self.rank[x] = 0
            return x
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: str, y: str):
        rx = self.find(x)
        ry = self.find(y)
        if rx != ry:
            if self.rank[rx] < self.rank[ry]:
                self.parent[rx] = ry
            elif self.rank[rx] > self.rank[ry]:
                self.parent[ry] = rx
            else:
                self.parent[ry] = rx
                self.rank[rx] += 1

def build_overlapping_gene_groups(gene_symbols: List[str]) -> Dict[str, str]:
    """
    Groups co-occurring or overlapping genes into connected components.
    Ensures variants in overlapping genes (e.g. LDLR;MIR6886) share the same group ID.
    """
    dsu = DisjointSet()
    for entry in gene_symbols:
        if not entry:
            continue
        genes = [g.strip() for g in entry.replace("|", ";").split(";") if g.strip()]
        if len(genes) > 1:
            for i in range(1, len(genes)):
                dsu.union(genes[0], genes[i])
        elif len(genes) == 1:
            dsu.find(genes[0])

    gene_to_group = {}
    for entry in gene_symbols:
        if not entry:
            continue
        genes = [g.strip() for g in entry.replace("|", ";").split(";") if g.strip()]
        if genes:
            leader = dsu.find(genes[0])
            gene_to_group[entry] = f"gene_group_{leader}"

    return gene_to_group
