"""System health and diagnostic endpoints."""

from fastapi import APIRouter
from app.core.config import settings
from app.db.session import check_db_connection
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service & Database Health Status",
    description="Inspect overall API operation and test real connection to PostgreSQL database if configured.",
)
def get_health() -> HealthResponse:
    """Check API and actual database connectivity."""
    db_ok, db_msg = check_db_connection()

    return HealthResponse(
        status="ok" if db_ok else "degraded",
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        storage_mode=settings.active_storage_mode,
        database_status="connected" if db_ok else "unavailable",
        database_detail=db_msg,
    )
