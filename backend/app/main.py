from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes_health import router as health_router
from app.api.routes_variants import router as variants_router
from app.api.routes_model_info import router as model_info_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router, prefix="/api")
app.include_router(variants_router, prefix="/api")
app.include_router(model_info_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "project": "VariantLens",
        "description": "Explainable Genetic Variant Explorer API",
        "docs": "/docs",
        "health": "/api/health",
        "status": "active"
    }
