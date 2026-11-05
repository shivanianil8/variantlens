from pydantic import BaseModel
from typing import Dict, Any

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    runtime_info: Dict[str, Any]
