"""Main API v1 router aggregator."""

from fastapi import APIRouter
from app.api.routes import health, items, auth, claims, notifications, matches

api_router = APIRouter()

# Register endpoint routers
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(items.router, prefix="/items", tags=["Items"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(claims.router, prefix="/claims", tags=["Claims"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(matches.router, prefix="/matches", tags=["AI Matches"])
