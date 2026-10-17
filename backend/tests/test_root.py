"""Tests for FastAPI root endpoint and CORS headers."""

from fastapi.testclient import TestClient


def test_root_endpoint_success(client: TestClient) -> None:
    """Verify that root endpoint returns HTTP 200 with application metadata."""
    response = client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert data["app_name"] == "FindIt API"
    assert "version" in data
    assert data["status"] == "online"
    assert data["storage_mode"] in ["sqlite", "postgresql"]
    assert data["database_configured"] is True
    assert data["docs_url"] == "/docs"
    assert data["health_check"] == "/api/v1/health"
    assert "tagline" in data


def test_cors_preflight_headers(client: TestClient) -> None:
    """Verify CORS preflight handling for Vite frontend development origins."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/api/v1/items", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_preflight_vercel_production(client: TestClient) -> None:
    """Verify CORS preflight handling for deployed production Vercel origin."""
    headers = {
        "Origin": "https://findit-production.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
    }
    response = client.options("/api/v1/auth/register", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://findit-production.vercel.app"


def test_cors_preflight_vercel_preview_regex(client: TestClient) -> None:
    """Verify CORS preflight handling for dynamic preview Vercel origins."""
    headers = {
        "Origin": "https://findit-production-40x66glmq-priyanshukaran25-5139.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
    }
    response = client.options("/api/v1/auth/register", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://findit-production-40x66glmq-priyanshukaran25-5139.vercel.app"
