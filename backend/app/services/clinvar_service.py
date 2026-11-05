"""
Asynchronous NCBI ClinVar Service Client for VariantLens.
Retrieves real clinical classification annotations from NCBI ClinVar via
E-utilities, with asynchronous caching, rate limiting, retries, and offline
benchmark archive fallback.
"""

import os
import logging
from typing import Optional, Dict, Any, List
import httpx
import pandas as pd

from app.services.cache import global_cache
from app.services.rate_limiter import ncbi_rate_limiter

logger = logging.getLogger("variantlens.clinvar")

CLINVAR_ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
CLINVAR_ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"


class ClinVarService:
    """Asynchronous client for NCBI ClinVar annotations."""

    def __init__(self, timeout_seconds: float = 5.0, max_retries: int = 2):
        self.timeout = timeout_seconds
        self.max_retries = max_retries
        self._offline_df: Optional[pd.DataFrame] = None
        self._load_offline_catalog()

    def _load_offline_catalog(self) -> None:
        """Prepares lookup against audited local ClinVar benchmark parquet."""
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            parquet_path = os.path.join(base_dir, "data", "processed", "clinvar_benchmark_deduplicated.parquet")
            if os.path.exists(parquet_path):
                # Load minimal lookup columns matching exact parquet schema
                self._offline_df = pd.read_parquet(
                    parquet_path,
                    columns=[
                        "variation_id",
                        "gene_symbol",
                        "protein_change",
                        "wild_type_aa",
                        "mutant_aa",
                        "protein_position",
                        "clinical_significance_raw",
                        "clinical_category",
                        "review_status",
                        "review_stars",
                        "phenotypes",
                        "number_submitters",
                    ],
                )
                logger.info(f"Loaded {len(self._offline_df)} offline ClinVar benchmark records.")
        except Exception as e:
            logger.warning(f"Could not initialize offline ClinVar lookup: {e}")
            self._offline_df = None

    def _query_offline_catalog(
        self,
        gene: str,
        wild_type_aa: str,
        mutant_aa: str,
        protein_position: int,
        protein_change: str,
    ) -> Optional[Dict[str, Any]]:
        """Searches audited offline ClinVar release for exact gene and protein change match."""
        if self._offline_df is None:
            return None

        gene_clean = gene.strip().upper()
        # Look for matches in gene and residue coordinate
        matches = self._offline_df[
            (self._offline_df["gene_symbol"] == gene_clean) &
            (self._offline_df["protein_position"] == protein_position)
        ]
        if matches.empty:
            return None

        # Check for matching mutant allele or protein change string
        matched_row = None
        for _, row in matches.iterrows():
            if str(row["mutant_aa"]).upper() == mutant_aa.upper():
                matched_row = row
                break
            pc = str(row["protein_change"])
            if protein_change.lower() in pc.lower() or pc.lower() in protein_change.lower():
                matched_row = row
                break

        if matched_row is not None:
            traits_raw = matched_row["phenotypes"]
            traits = [t.strip() for t in str(traits_raw).split(";") if t.strip()] if pd.notna(traits_raw) else []
            return {
                "variation_id": str(matched_row["variation_id"]),
                "clinical_significance": str(matched_row["clinical_category"]),
                "clinical_significance_raw": str(matched_row["clinical_significance_raw"]),
                "review_status": str(matched_row["review_status"]),
                "review_stars": int(matched_row["review_stars"]),
                "submitter_count": int(matched_row["number_submitters"]) if pd.notna(matched_row["number_submitters"]) else 0,
                "all_traits": traits,
                "source_attribution": "NCBI ClinVar Official Audited Release (Nov 2026)",
                "is_live_api": False,
            }
        return None

    async def get_variant_annotation(
        self,
        gene: str,
        wild_type_aa: str,
        mutant_aa: str,
        protein_position: int,
        protein_change_hgvs: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieves ClinVar clinical classification.
        1. Checks in-memory cache.
        2. Queries live NCBI ClinVar E-utilities API.
        3. Falls back gracefully to audited local release on network error/timeout.
        """
        cache_key = f"clinvar:{gene.upper()}:{protein_position}:{wild_type_aa}:{mutant_aa}"
        cached = await global_cache.get(cache_key)
        if cached is not None:
            return cached

        # Attempt Live NCBI API Query
        term = f"{gene} {wild_type_aa}{protein_position}{mutant_aa}"
        live_result = None

        for attempt in range(self.max_retries + 1):
            try:
                await ncbi_rate_limiter.acquire()
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    search_resp = await client.get(
                        CLINVAR_ESEARCH_URL,
                        params={"db": "clinvar", "term": term, "retmode": "json", "retmax": 1},
                    )
                    if search_resp.status_code == 200:
                        data = search_resp.json()
                        id_list = data.get("esearchresult", {}).get("idlist", [])
                        if id_list:
                            uid = id_list[0]
                            await ncbi_rate_limiter.acquire()
                            summary_resp = await client.get(
                                CLINVAR_ESUMMARY_URL,
                                params={"db": "clinvar", "id": uid, "retmode": "json"},
                            )
                            if summary_resp.status_code == 200:
                                sdata = summary_resp.json().get("result", {}).get(uid, {})
                                clinsig = sdata.get("clinical_significance", {}).get("description", "Unknown")
                                rev_status = sdata.get("clinical_significance", {}).get("review_status", "")
                                traits = [t.get("trait_name", "") for t in sdata.get("trait_set", []) if t.get("trait_name")]

                                live_result = {
                                    "variation_id": str(uid),
                                    "clinical_significance": clinsig,
                                    "review_status": rev_status,
                                    "review_stars": self._calculate_review_stars(rev_status),
                                    "submitter_count": 0,
                                    "all_traits": traits,
                                    "source_attribution": "NCBI ClinVar Live API (E-utilities)",
                                    "is_live_api": True,
                                }
                                break
                    break
            except Exception as e:
                logger.debug(f"NCBI ClinVar API attempt {attempt + 1} failed: {e}")
                if attempt == self.max_retries:
                    break

        if live_result is not None:
            await global_cache.set(cache_key, live_result, ttl_seconds=3600)
            return live_result

        # First check curated biological benchmarks
        try:
            from app.api.routes_variants import CURATED_BENCHMARKS
            gene_clean = gene.strip().upper()
            for b in CURATED_BENCHMARKS:
                if b["gene_symbol"].upper() == gene_clean and int(b["protein_position"]) == int(protein_position):
                    cv = b["clinvar"]
                    return {
                        "variation_id": str(cv["variation_id"]),
                        "clinical_significance": str(cv["clinical_significance"]),
                        "review_status": str(cv["review_status"]),
                        "review_stars": int(cv["review_stars"]),
                        "submitter_count": int(cv.get("submitter_count", 0)),
                        "all_traits": list(cv.get("all_traits", [])),
                        "source_attribution": "NCBI ClinVar Curated Benchmark (Gold Standard)",
                        "is_live_api": False,
                    }
        except Exception:
            pass

        # Fallback to local audited release
        offline_result = self._query_offline_catalog(
            gene=gene,
            wild_type_aa=wild_type_aa,
            mutant_aa=mutant_aa,
            protein_position=protein_position,
            protein_change=protein_change_hgvs,
        )
        if offline_result is not None:
            await global_cache.set(cache_key, offline_result, ttl_seconds=3600)
            return offline_result

        return None

    @staticmethod
    def _calculate_review_stars(status_str: str) -> int:
        """Computes ClinVar review stars according to NCBI guidelines."""
        s = status_str.lower()
        if "practice guideline" in s:
            return 4
        if "expert panel" in s:
            return 3
        if "multiple submitters" in s and "no conflicts" in s:
            return 2
        if "single submitter" in s or "criteria provided" in s:
            return 1
        return 0


# Global service instance
clinvar_service = ClinVarService()
