"""
Asynchronous Rate Limiter for External Bioinformatics APIs.
Enforces NCBI, UniProt, and EBI request rate guidelines (e.g. max 3 req/sec).
"""

import asyncio
import time


class AsyncRateLimiter:
    """Token bucket rate limiter for asyncio-based HTTP clients."""

    def __init__(self, max_requests_per_second: float = 3.0):
        self.interval = 1.0 / max_requests_per_second
        self.last_request_time = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Blocks until rate-limit spacing has elapsed."""
        async with self._lock:
            now = time.time()
            elapsed = now - self.last_request_time
            if elapsed < self.interval:
                await asyncio.sleep(self.interval - elapsed)
            self.last_request_time = time.time()


# Standard rate limiters
ncbi_rate_limiter = AsyncRateLimiter(max_requests_per_second=3.0)
uniprot_rate_limiter = AsyncRateLimiter(max_requests_per_second=5.0)
alphafold_rate_limiter = AsyncRateLimiter(max_requests_per_second=5.0)
