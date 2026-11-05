import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes_health import router as health_router
from app.api.routes_variants import router as variants_router
from app.api.routes_model_info import router as model_info_router
from app.api.routes_predict import router as predict_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
allowed_origins = list(settings.ALLOWED_ORIGINS)
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health check for Render and cloud load balancers
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "VariantLens API",
        "model_version": "1.0.0-xgb-final-deployed"
    }

# Include Routers
app.include_router(health_router, prefix="/api")
app.include_router(variants_router, prefix="/api")
app.include_router(model_info_router, prefix="/api")
app.include_router(predict_router, prefix="/api")

# Static mount for official offline experiment plots and visualizations
artifacts_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ml", "artifacts")
if os.path.exists(artifacts_dir):
    app.mount("/api/artifacts", StaticFiles(directory=artifacts_dir), name="artifacts")

@app.get("/")
async def root():
    return {
        "project": "VariantLens",
        "description": "Explainable Genetic Variant Explorer API",
        "docs": "/docs",
        "health": "/api/health",
        "status": "active"
    }
