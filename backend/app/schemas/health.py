"""Healthcheck schema contracts."""

from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """System health check status response model."""

    status: str = Field(..., description="Overall API service health status (e.g. 'ok')")
    app_name: str = Field(..., description="Name of the application service")
    version: str = Field(..., description="API semver version")
    environment: str = Field(..., description="Active runtime environment")
    storage_mode: str = Field(
        "sqlite",
        description="Active data storage mechanism: 'sqlite', 'postgresql', or 'in_memory_development'",
    )
    database_status: str = Field(..., description="'connected' or 'unavailable'")
    database_detail: Optional[str] = Field(None, description="Detailed database connection status message")
