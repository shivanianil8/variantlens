"""
Asynchronous In-Memory TTL Cache for VariantLens Service Clients.
Provides thread-safe expiring key-value storage to eliminate redundant
network calls to external bioinformatics APIs (NCBI, UniProt, AlphaFold, PubMed).
"""

import time
import asyncio
from typing import Any, Optional, Dict, Tuple


class AsyncTTLCache:
    """Thread-safe asynchronous cache with time-to-live (TTL) expiration."""

    def __init__(self, default_ttl_seconds: int = 3600, max_size: int = 1000):
        self.default_ttl = default_ttl_seconds
        self.max_size = max_size
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """Retrieves an item from cache if present and not expired."""
        async with self._lock:
            if key not in self._cache:
                return None
            val, expire_at = self._cache[key]
            if time.time() > expire_at:
                del self._cache[key]
                return None
            return val

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """Stores an item in the cache with expiration."""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        expire_at = time.time() + ttl
        async with self._lock:
            if len(self._cache) >= self.max_size and key not in self._cache:
                # Evict oldest entry
                oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
                del self._cache[oldest_key]
            self._cache[key] = (value, expire_at)

    async def clear(self) -> None:
        """Clears all cached entries."""
        async with self._lock:
            self._cache.clear()


# Global cache instance
global_cache = AsyncTTLCache(default_ttl_seconds=3600, max_size=2000)
