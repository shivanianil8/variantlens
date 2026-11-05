import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "VariantLens API"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "Explainable Genetic Variant Explorer & Pathogenicity Research API"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # Server host & port
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # Provenance & API credits
    NCBI_EMAIL: str = "variantlens-research@example.edu"
    NCBI_API_KEY: str = ""
    
    # Storage paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    CACHE_DIR: str = os.path.join(BASE_DIR, "..", "data_cache")
    ARTIFACTS_DIR: str = os.path.join(BASE_DIR, "ml", "artifacts")

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
