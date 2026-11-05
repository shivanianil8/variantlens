"""
Asynchronous UniProt REST API Service Client for VariantLens.
Resolves human gene symbols to canonical UniProtKB/Swiss-Prot accessions,
protein names, and sequence lengths, with caching, polite rate limiting,
and curated human proteome fallbacks.
"""

import logging
from typing import Optional, Dict, Any
import httpx

from app.services.cache import global_cache
from app.services.rate_limiter import uniprot_rate_limiter
from ml_pipeline.protein_mapping import GENE_TO_UNIPROT, CANONICAL_PROTEIN_LENGTHS

logger = logging.getLogger("variantlens.uniprot")

UNIPROT_SEARCH_URL = "https://rest.uniprot.org/uniprotkb/search"


class UniProtService:
    """Asynchronous client for UniProtKB REST API."""

    def __init__(self, timeout_seconds: float = 5.0, max_retries: int = 2):
        self.timeout = timeout_seconds
        self.max_retries = max_retries

    async def get_protein_info(self, gene_symbol: str) -> Optional[Dict[str, Any]]:
        """
        Resolves gene symbol to canonical UniProt accession, protein name, and sequence length.
        Checks cache -> queries live UniProt REST API -> falls back to curated proteome catalog.
        """
        gene_clean = gene_symbol.strip().upper()
        cache_key = f"uniprot:{gene_clean}"
        cached = await global_cache.get(cache_key)
        if cached is not None:
            return cached

        # Attempt live UniProt API
        live_result = None
        for attempt in range(self.max_retries + 1):
            try:
                await uniprot_rate_limiter.acquire()
                query = f"gene_exact:{gene_clean} AND organism_id:9606 AND reviewed:true"
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.get(
                        UNIPROT_SEARCH_URL,
                        params={"query": query, "format": "json", "size": 1},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        results = data.get("results", [])
                        if results:
                            entry = results[0]
                            accession = entry.get("primaryAccession")
                            desc = entry.get("proteinDescription", {})
                            rec_name = (
                                desc.get("recommendedName", {})
                                .get("fullName", {})
                                .get("value", f"{gene_clean} protein")
                            )
                            seq_len = entry.get("sequence", {}).get("length")

                            live_result = {
                                "gene_symbol": gene_clean,
                                "uniprot_accession": accession,
                                "protein_name": rec_name,
                                "sequence_length": seq_len,
                                "source_attribution": "UniProtKB/Swiss-Prot REST API",
                                "is_live_api": True,
                            }
                            break
                    break
            except Exception as e:
                logger.debug(f"UniProt API attempt {attempt + 1} failed: {e}")
                if attempt == self.max_retries:
                    break

        if live_result is not None:
            await global_cache.set(cache_key, live_result, ttl_seconds=86400)
            return live_result

        # Curated catalog fallback
        if gene_clean in GENE_TO_UNIPROT:
            accession = GENE_TO_UNIPROT[gene_clean]
            seq_len = CANONICAL_PROTEIN_LENGTHS.get(gene_clean)
            offline_result = {
                "gene_symbol": gene_clean,
                "uniprot_accession": accession,
                "protein_name": f"Human {gene_clean} protein",
                "sequence_length": seq_len,
                "source_attribution": "Curated UniProtKB/Swiss-Prot Canonical Catalog",
                "is_live_api": False,
            }
            await global_cache.set(cache_key, offline_result, ttl_seconds=86400)
            return offline_result

        return None


# Global service instance
uniprot_service = UniProtService()
