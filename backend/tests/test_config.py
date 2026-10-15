"""Tests for application settings and configuration logic."""

from app.core.config import Settings


def test_default_settings() -> None:
    """Verify default configuration values."""
    s = Settings()
    assert s.PROJECT_NAME == "FindIt API"
    assert s.API_V1_STR == "/api/v1"
    assert s.POSTGRES_PORT == 5432
    assert s.sqlalchemy_database_uri.startswith("sqlite:///")
    assert s.is_sqlite is True
    assert s.active_storage_mode == "sqlite"


def test_cors_string_parsing() -> None:
    """Verify comma-separated string parsing for CORS origins."""
    s = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000,http://localhost:5173")
    assert "http://localhost:3000" in s.BACKEND_CORS_ORIGINS
    assert "http://localhost:5173" in s.BACKEND_CORS_ORIGINS


def test_custom_database_url_override() -> None:
    """Verify explicit DATABASE_URL takes priority."""
    custom_url = "postgresql+psycopg://test_user:secret@db.internal:5432/custom_db"
    s = Settings(DATABASE_URL=custom_url)
    assert s.sqlalchemy_database_uri == custom_url


def test_neon_postgres_scheme_normalization() -> None:
    """Verify that postgres:// from cloud providers is converted to postgresql+psycopg:// with SSL."""
    neon_raw = "postgres://test_user:fake_test_password@ep-fake-sample.us-east-2.aws.neon.tech/fake_db"
    s = Settings(DATABASE_URL=neon_raw)
    normalized = s.sqlalchemy_database_uri
    assert normalized.startswith("postgresql+psycopg://")
    assert "sslmode=require" in normalized


def test_neon_postgresql_scheme_normalization() -> None:
    """Verify that standard postgresql:// is converted to postgresql+psycopg:// preserving sslmode."""
    neon_raw = "postgresql://test_user:fake_test_password@ep-fake-sample.us-east-2.aws.neon.tech/fake_db?sslmode=require"
    s = Settings(DATABASE_URL=neon_raw)
    normalized = s.sqlalchemy_database_uri
    assert normalized.startswith("postgresql+psycopg://")
    assert "sslmode=require" in normalized
    assert normalized.count("sslmode=require") == 1
