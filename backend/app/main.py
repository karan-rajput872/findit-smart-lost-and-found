"""FindIt FastAPI Application Entrypoint."""

import logging
from typing import Dict, Any
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.router import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("findit.api")

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown procedures."""
    if settings.ENVIRONMENT.lower() == "production":
        if "insecure" in settings.JWT_SECRET_KEY or settings.JWT_SECRET_KEY == "findit-dev-insecure-jwt-secret-key-change-in-production-2026":
            logger.warning(
                "CRITICAL SECURITY ALERT: Production environment is running with default insecure JWT_SECRET_KEY. "
                "Ensure JWT_SECRET_KEY is securely configured via environment variables."
            )
        if not settings.is_postgres:
            raise RuntimeError(
                "CRITICAL PRODUCTION CONFIGURATION ERROR: Production environment is not configured with PostgreSQL. "
                "Configure DATABASE_URL with your verified Neon PostgreSQL connection string."
            )
    from app.db.init_db import init_db
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Campus-first Smart Lost & Found Platform REST API.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENABLE_DOCS else None,
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    lifespan=lifespan,
)

# Configure CORS Middleware
_cors_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS] if settings.BACKEND_CORS_ORIGINS else []
if "https://findit-production.vercel.app" not in _cors_origins:
    _cors_origins.append("https://findit-production.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount persistent static upload directory
import os
from fastapi.staticfiles import StaticFiles
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")



@app.exception_handler(Exception)
async def global_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Capture unexpected internal server exceptions safely."""
    logger.error("Unhandled server exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred.",
            "error_type": exc.__class__.__name__,
        },
    )


# Root healthcheck convenience endpoint
from app.api.routes.health import get_health
from app.schemas.health import HealthResponse

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Root"],
    summary="Convenience Root Health Check",
    description="Quick health diagnostics endpoint available at service root.",
)
def root_health() -> HealthResponse:
    """Convenience root health endpoint."""
    return get_health()


# Root information endpoint
@app.get(
    "/",
    tags=["Root"],
    summary="API Root Information",
    description="Returns metadata about the FindIt service and links to API documentation.",
)
def root() -> Dict[str, Any]:
    """Root metadata endpoint."""
    from app.db.session import engine
    active_storage = engine.dialect.name if engine is not None else settings.active_storage_mode
    return {
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "environment": settings.ENVIRONMENT,
        "storage_mode": active_storage,
        "database_configured": settings.is_database_configured,
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
        "tagline": "Don't lose hope. Find what matters.",
    }


# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)
