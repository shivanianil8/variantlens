import sys
from fastapi import APIRouter
from app.schemas.health import HealthResponse
from app.core.config import settings

router = APIRouter(tags=["System Health"])

@router.get("/health", response_model=HealthResponse)
async def get_health():
    """Returns server runtime health and environment status."""
    return HealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        runtime_info={
            "python_version": sys.version.split()[0],
            "debug": settings.DEBUG,
            "fastapi": "active"
        }
    )
