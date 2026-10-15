"""Tests for health and database connectivity diagnostics."""

from unittest.mock import patch
from fastapi.testclient import TestClient


def test_root_health_endpoint(client: TestClient) -> None:
    """Verify that the convenience /health endpoint at the root path responds."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["app_name"] == "FindIt API"
    assert "storage_mode" in data
    assert data["status"] in ["ok", "degraded"]


def test_api_v1_health_endpoint_db_connected(client: TestClient) -> None:
    """Verify health endpoint response structure when database is connected."""
    with patch("app.api.routes.health.check_db_connection", return_value=(True, "connected")):
        response = client.get("/api/v1/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "ok"
        assert data["app_name"] == "FindIt API"
        assert data["database_status"] == "connected"
        assert data["database_detail"] == "connected"
        assert "version" in data
        assert "environment" in data
        assert "storage_mode" in data


def test_health_endpoint_db_unavailable(client: TestClient) -> None:
    """Verify health endpoint reports degraded and unavailable when DB connection fails."""
    with patch("app.api.routes.health.check_db_connection", return_value=(False, "Database connection unavailable")):
        response = client.get("/api/v1/health")
        assert response.status_code == 200

        data = response.json()
        assert data["app_name"] == "FindIt API"
        assert data["status"] == "degraded"
        assert data["database_status"] == "unavailable"
