"""
Asynchronous AlphaFold Protein Structure Database Service Client.
Retrieves 3D structural model URLs (PDB and mmCIF) and residue confidence (pLDDT)
from the official AlphaFold Protein Structure Database (EBI / DeepMind).
"""

import logging
from typing import Optional, Dict, Any
import httpx

from app.services.cache import global_cache
from app.services.rate_limiter import alphafold_rate_limiter

logger = logging.getLogger("variantlens.alphafold")

ALPHAFOLD_API_URL = "https://alphafold.ebi.ac.uk/api/prediction"


class AlphaFoldService:
    """Asynchronous client for AlphaFold DB."""

    def __init__(self, timeout_seconds: float = 5.0, max_retries: int = 2):
        self.timeout = timeout_seconds
        self.max_retries = max_retries

    async def get_structure_info(self, uniprot_accession: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves PDB and mmCIF model URLs and metadata for a UniProt accession.
        Checks cache -> queries live AlphaFold API -> constructs canonical URLs if accession valid.
        """
        acc_clean = uniprot_accession.strip().upper()
        if not acc_clean:
            return None

        cache_key = f"alphafold:{acc_clean}"
        cached = await global_cache.get(cache_key)
        if cached is not None:
            return cached

        live_result = None
        for attempt in range(self.max_retries + 1):
            try:
                await alphafold_rate_limiter.acquire()
                url = f"{ALPHAFOLD_API_URL}/{acc_clean}"
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        if isinstance(data, list) and len(data) > 0:
                            entry = data[0]
                            live_result = {
                                "uniprot_accession": acc_clean,
                                "pdb_url": entry.get("pdbUrl"),
                                "cif_url": entry.get("cifUrl"),
                                "model_url": entry.get("cifUrl"),
                                "global_plddt": entry.get("globalMetricValue"),
                                "latest_version": entry.get("latestVersion", 4),
                                "source_attribution": "AlphaFold DB Live API (EBI / DeepMind)",
                                "is_live_api": True,
                            }
                            break
                    break
            except Exception as e:
                logger.debug(f"AlphaFold API attempt {attempt + 1} failed: {e}")
                if attempt == self.max_retries:
                    break

        if live_result is not None:
            await global_cache.set(cache_key, live_result, ttl_seconds=86400)
            return live_result

        # Canonical URL construct fallback for known UniProt accessions
        standard_cif = f"https://alphafold.ebi.ac.uk/files/AF-{acc_clean}-F1-model_v4.cif"
        standard_pdb = f"https://alphafold.ebi.ac.uk/files/AF-{acc_clean}-F1-model_v4.pdb"
        offline_result = {
            "uniprot_accession": acc_clean,
            "pdb_url": standard_pdb,
            "cif_url": standard_cif,
            "model_url": standard_cif,
            "global_plddt": None,
            "latest_version": 4,
            "source_attribution": "AlphaFold Protein Structure Database v4 (Canonical Repository URL)",
            "is_live_api": False,
        }
        await global_cache.set(cache_key, offline_result, ttl_seconds=86400)
        return offline_result


# Global service instance
alphafold_service = AlphaFoldService()
