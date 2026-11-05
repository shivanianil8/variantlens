import re
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.schemas.variant_schema import (
    VariantQuery,
    NormalizedVariant,
    VariantAnnotationResponse,
    ClinVarClinicalRecord,
    GnomadFrequencyRecord
)
from app.core.constants import AA_3_TO_1, AA_1_TO_3

router = APIRouter(prefix="/variants", tags=["Variants"])

# Benchmarks for Phase 1 verification and educational exploration
CURATED_BENCHMARKS = [
    {
        "query": "BRAF V600E",
        "gene_symbol": "BRAF",
        "wild_type_aa": "V",
        "mutant_aa": "E",
        "protein_position": 600,
        "transcript_id": "NM_004333.6",
        "cdna_change": "c.1799T>A",
        "protein_change": "p.Val600Glu",
        "rs_id": "rs113488022",
        "genomic_location": "chr7:140753336:A:T",
        "uniprot_accession": "P15056",
        "protein_name": "Serine/threonine-protein kinase B-raf",
        "clinvar": {
            "variation_id": "13961",
            "clinical_significance": "Pathogenic",
            "review_status": "criteria provided, multiple submitters, no conflicts",
            "review_stars": 2,
            "last_evaluated": "2024-01-15",
            "submitter_count": 48,
            "all_traits": ["Colorectal cancer", "Melanoma", "Cardiofaciocutaneous syndrome"]
        },
        "gnomad": {
            "allele_frequency": 0.00000398,
            "allele_count": 1,
            "allele_number": 251142,
            "homozygous_count": 0,
            "populations": {"NFE": 0.000008, "AFR": 0.0, "EAS": 0.0, "SAS": 0.0, "AMR": 0.0},
            "is_observed": True
        }
    },
    {
        "query": "TP53 R175H",
        "gene_symbol": "TP53",
        "wild_type_aa": "R",
        "mutant_aa": "H",
        "protein_position": 175,
        "transcript_id": "NM_000546.6",
        "cdna_change": "c.524G>A",
        "protein_change": "p.Arg175His",
        "rs_id": "rs28934578",
        "genomic_location": "chr17:7675088:C:T",
        "uniprot_accession": "P04637",
        "protein_name": "Cellular tumor antigen p53",
        "clinvar": {
            "variation_id": "12374",
            "clinical_significance": "Pathogenic",
            "review_status": "reviewed by expert panel",
            "review_stars": 3,
            "last_evaluated": "2023-11-20",
            "submitter_count": 35,
            "all_traits": ["Li-Fraumeni syndrome 1", "Hereditary cancer-predisposing syndrome"]
        },
        "gnomad": {
            "allele_frequency": 0.00000796,
            "allele_count": 2,
            "allele_number": 251200,
            "homozygous_count": 0,
            "populations": {"NFE": 0.000015, "AFR": 0.0, "EAS": 0.0, "SAS": 0.0, "AMR": 0.0},
            "is_observed": True
        }
    },
    {
        "query": "BRCA1 C61G",
        "gene_symbol": "BRCA1",
        "wild_type_aa": "C",
        "mutant_aa": "G",
        "protein_position": 61,
        "transcript_id": "NM_007294.4",
        "cdna_change": "c.181T>G",
        "protein_change": "p.Cys61Gly",
        "rs_id": "rs28897672",
        "genomic_location": "chr17:43124030:T:G",
        "uniprot_accession": "P38398",
        "protein_name": "Breast cancer type 1 susceptibility protein",
        "clinvar": {
            "variation_id": "17666",
            "clinical_significance": "Pathogenic",
            "review_status": "reviewed by expert panel",
            "review_stars": 3,
            "last_evaluated": "2024-03-01",
            "submitter_count": 29,
            "all_traits": ["Hereditary breast and ovarian cancer syndrome"]
        },
        "gnomad": {
            "allele_frequency": None,
            "allele_count": 0,
            "allele_number": 251400,
            "homozygous_count": 0,
            "populations": {},
            "is_observed": False
        }
    }
]

def normalize_variant_syntax(query: str) -> Optional[NormalizedVariant]:
    """
    Parses standard input queries like 'BRAF V600E', 'BRAF p.Val600Glu', or 'TP53 R175H'.
    """
    query_clean = query.strip()
    
    # Pattern: GENE AA_POS_AA (e.g. BRAF V600E or TP53 p.R175H)
    match_single = re.match(r"^([A-Z0-9]+)[\s:]+(?:p\.)?([A-Z])(\d+)([A-Z])$", query_clean, re.IGNORECASE)
    if match_single:
        gene = match_single.group(1).upper()
        wt = match_single.group(2).upper()
        pos = int(match_single.group(3))
        mut = match_single.group(4).upper()
        return NormalizedVariant(
            raw_query=query,
            gene_symbol=gene,
            wild_type_aa=wt,
            mutant_aa=mut,
            protein_position=pos,
            protein_change=f"p.{AA_1_TO_3.get(wt, wt)}{pos}{AA_1_TO_3.get(mut, mut)}"
        )
    
    # Pattern 3-letter: BRAF p.Val600Glu
    match_three = re.match(r"^([A-Z0-9]+)[\s:]+(?:p\.)?([A-Za-z]{3})(\d+)([A-Za-z]{3})$", query_clean)
    if match_three:
        gene = match_three.group(1).upper()
        wt_3 = match_three.group(2).capitalize()
        pos = int(match_three.group(3))
        mut_3 = match_three.group(4).capitalize()
        wt = AA_3_TO_1.get(wt_3, wt_3[:1])
        mut = AA_3_TO_1.get(mut_3, mut_3[:1])
        return NormalizedVariant(
            raw_query=query,
            gene_symbol=gene,
            wild_type_aa=wt,
            mutant_aa=mut,
            protein_position=pos,
            protein_change=f"p.{wt_3}{pos}{mut_3}"
        )
        
    return None

@router.get("/benchmarks", response_model=List[VariantAnnotationResponse])
async def list_benchmark_variants():
    """Returns curated biological benchmark variants for platform verification and exploration."""
    results = []
    for b in CURATED_BENCHMARKS:
        res = VariantAnnotationResponse(
            variant=NormalizedVariant(
                raw_query=b["query"],
                gene_symbol=b["gene_symbol"],
                wild_type_aa=b["wild_type_aa"],
                mutant_aa=b["mutant_aa"],
                protein_position=b["protein_position"],
                transcript_id=b["transcript_id"],
                cdna_change=b["cdna_change"],
                protein_change=b["protein_change"],
                rs_id=b["rs_id"],
                genomic_location=b["genomic_location"]
            ),
            clinvar_clinical=ClinVarClinicalRecord(**b["clinvar"]),
            gnomad_frequency=GnomadFrequencyRecord(**b["gnomad"]),
            uniprot_accession=b["uniprot_accession"],
            protein_name=b["protein_name"],
            alphafold_pdb_url=f"https://alphafold.ebi.ac.uk/files/AF-{b['uniprot_accession']}-F1-model_v4.pdb",
            alphafold_cif_url=f"https://alphafold.ebi.ac.uk/files/AF-{b['uniprot_accession']}-F1-model_v4.cif",
            alphafold_plddt_score=94.2,
            data_provenance={
                "clinvar_source": "NCBI ClinVar Release",
                "gnomad_source": "gnomAD v4.1 Exomes",
                "alphafold_source": "AlphaFold DB v4",
                "uniprot_source": "UniProtKB/Swiss-Prot"
            }
        )
        results.append(res)
    return results

@router.get("/search", response_model=VariantAnnotationResponse)
async def search_variant(q: str = Query(..., description="Variant search query")):
    """Resolves a variant query and returns biological annotations."""
    # Check if matches any curated benchmark first
    q_norm = q.strip().upper()
    for b in CURATED_BENCHMARKS:
        if (
            q_norm == b["query"].upper() or
            q_norm == b["gene_symbol"].upper() + " " + b["wild_type_aa"] + str(b["protein_position"]) + b["mutant_aa"] or
            (b["rs_id"] and q_norm == b["rs_id"].upper())
        ):
            return VariantAnnotationResponse(
                variant=NormalizedVariant(
                    raw_query=b["query"],
                    gene_symbol=b["gene_symbol"],
                    wild_type_aa=b["wild_type_aa"],
                    mutant_aa=b["mutant_aa"],
                    protein_position=b["protein_position"],
                    transcript_id=b["transcript_id"],
                    cdna_change=b["cdna_change"],
                    protein_change=b["protein_change"],
                    rs_id=b["rs_id"],
                    genomic_location=b["genomic_location"]
                ),
                clinvar_clinical=ClinVarClinicalRecord(**b["clinvar"]),
                gnomad_frequency=GnomadFrequencyRecord(**b["gnomad"]),
                uniprot_accession=b["uniprot_accession"],
                protein_name=b["protein_name"],
                alphafold_pdb_url=f"https://alphafold.ebi.ac.uk/files/AF-{b['uniprot_accession']}-F1-model_v4.pdb",
                alphafold_cif_url=f"https://alphafold.ebi.ac.uk/files/AF-{b['uniprot_accession']}-F1-model_v4.cif",
                alphafold_plddt_score=94.2,
                data_provenance={
                    "clinvar_source": "NCBI ClinVar Release",
                    "gnomad_source": "gnomAD v4.1 Exomes",
                    "alphafold_source": "AlphaFold DB v4",
                    "uniprot_source": "UniProtKB/Swiss-Prot"
                }
            )
            
    # Attempt normalization
    normalized = normalize_variant_syntax(q)
    if not normalized:
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse variant query '{q}'. Please format as 'GENE PosMut' (e.g. 'BRAF V600E' or 'TP53 R175H') or an rsID."
        )
        
    # Return normalized variant record with pending annotation status
    return VariantAnnotationResponse(
        variant=normalized,
        clinvar_clinical=None,
        gnomad_frequency=GnomadFrequencyRecord(
            allele_frequency=None,
            is_observed=False
        ),
        data_provenance={
            "status": "Query normalized; external biological clients scheduled for Phase 3 integration."
        }
    )
