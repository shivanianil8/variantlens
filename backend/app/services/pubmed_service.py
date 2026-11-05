"""
Asynchronous NCBI PubMed E-utilities Service Client for VariantLens.
Retrieves real scientific literature references and citations for genetic variants,
with polite rate limiting, asynchronous caching, timeouts, and transparent
empty responses when APIs are offline (never fabricating fake citations).
"""

import logging
from typing import List, Dict, Any, Optional
import httpx

from app.services.cache import global_cache
from app.services.rate_limiter import ncbi_rate_limiter

logger = logging.getLogger("variantlens.pubmed")

PUBMED_ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"


class PubMedService:
    """Asynchronous client for NCBI Entrez PubMed E-utilities."""

    def __init__(self, timeout_seconds: float = 5.0, max_retries: int = 2):
        self.timeout = timeout_seconds
        self.max_retries = max_retries

    async def search_citations(
        self,
        gene_symbol: str,
        variant_identifier: str,
        max_results: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Searches PubMed for real scientific articles regarding the variant.
        Never fabricates scientific citations if the NCBI API fails or returns no matches.
        """
        gene_clean = gene_symbol.strip().upper()
        var_clean = variant_identifier.strip()
        cache_key = f"pubmed:{gene_clean}:{var_clean}:{max_results}"

        cached = await global_cache.get(cache_key)
        if cached is not None:
            return cached

        term = f'("{gene_clean}" AND "{var_clean}") OR ("{gene_clean}"[Gene] AND "{var_clean}")'
        citations = []

        for attempt in range(self.max_retries + 1):
            try:
                await ncbi_rate_limiter.acquire()
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    # 1. ESearch
                    search_resp = await client.get(
                        PUBMED_ESEARCH_URL,
                        params={
                            "db": "pubmed",
                            "term": term,
                            "retmode": "json",
                            "retmax": max_results,
                            "sort": "pub_date",
                        },
                    )
                    if search_resp.status_code == 200:
                        sdata = search_resp.json()
                        id_list = sdata.get("esearchresult", {}).get("idlist", [])
                        if id_list:
                            uids_str = ",".join(id_list)
                            await ncbi_rate_limiter.acquire()
                            summary_resp = await client.get(
                                PUBMED_ESUMMARY_URL,
                                params={"db": "pubmed", "id": uids_str, "retmode": "json"},
                            )
                            if summary_resp.status_code == 200:
                                res_dict = summary_resp.json().get("result", {})
                                for pmid in id_list:
                                    if pmid in res_dict:
                                        art = res_dict[pmid]
                                        title = art.get("title", "")
                                        authors = [a.get("name", "") for a in art.get("authors", []) if a.get("name")]
                                        first_author = authors[0] if authors else "Unknown Authors"
                                        if len(authors) > 1:
                                            author_str = f"{first_author} et al."
                                        else:
                                            author_str = first_author

                                        source = art.get("source", "")
                                        pubdate = art.get("pubdate", "")
                                        doi = ""
                                        for aid in art.get("articleids", []):
                                            if aid.get("idtype") == "doi":
                                                doi = aid.get("value", "")
                                                break

                                        citations.append({
                                            "pmid": pmid,
                                            "title": title.rstrip("."),
                                            "authors_formatted": author_str,
                                            "all_authors": authors,
                                            "journal": source,
                                            "pub_date": pubdate,
                                            "doi": doi,
                                            "pubmed_url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                                            "doi_url": f"https://doi.org/{doi}" if doi else None,
                                            "source_attribution": "NCBI PubMed Entrez E-utilities",
                                        })
                                break
                    break
            except Exception as e:
                logger.debug(f"PubMed API attempt {attempt + 1} failed: {e}")
                if attempt == self.max_retries:
                    break

        # Cache result (even if empty, to prevent spamming failed queries)
        await global_cache.set(cache_key, citations, ttl_seconds=86400)
        return citations


# Global service instance
pubmed_service = PubMedService()
