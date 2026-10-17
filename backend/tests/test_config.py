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


def test_cors_trailing_slash_normalization() -> None:
    """Verify that trailing slashes are cleanly stripped from CORS origin URLs."""
    s = Settings(BACKEND_CORS_ORIGINS='["https://findit.vercel.app/", "http://localhost:5173/"]')
    assert "https://findit.vercel.app" in s.BACKEND_CORS_ORIGINS
    assert "https://findit.vercel.app/" not in s.BACKEND_CORS_ORIGINS
    assert "http://localhost:5173" in s.BACKEND_CORS_ORIGINS


def test_db_pool_settings_defaults_and_override() -> None:
    """Verify connection pool defaults and override settings."""
    s_default = Settings()
    assert s_default.DB_POOL_SIZE == 5
    assert s_default.DB_MAX_OVERFLOW == 10
    assert s_default.DB_POOL_TIMEOUT == 30
    assert s_default.DB_POOL_RECYCLE == 300
    assert s_default.DB_POOL_PRE_PING is True

    s_custom = Settings(DB_POOL_SIZE=8, DB_MAX_OVERFLOW=12)
    assert s_custom.DB_POOL_SIZE == 8
    assert s_custom.DB_MAX_OVERFLOW == 12


def test_psycopg2_driver_normalization() -> None:
    """Verify that postgresql+psycopg2:// is automatically normalized to postgresql+psycopg://."""
    legacy_url = "postgresql+psycopg2://test_user:pass@ep-sample.us-east-2.aws.neon.tech/db"
    s = Settings(DATABASE_URL=legacy_url)
    assert s.sqlalchemy_database_uri.startswith("postgresql+psycopg://")
    assert "sslmode=require" in s.sqlalchemy_database_uri


def test_cloud_host_ssl_enforcement() -> None:
    """Verify that cloud database endpoints receive sslmode=require."""
    render_db = "postgresql://dbuser:pass@dpg-sample.oregon-postgres.render.com/findit"
    s = Settings(DATABASE_URL=render_db)
    assert "sslmode=require" in s.sqlalchemy_database_uri


def test_production_without_database_url_raises_error() -> None:
    """Verify that ENVIRONMENT=production raises ValueError when DATABASE_URL is missing."""
    import pytest
    s = Settings(ENVIRONMENT="production", DATABASE_URL=None)
    with pytest.raises(ValueError, match="DATABASE_URL environment variable must be configured when ENVIRONMENT=production"):
        _ = s.sqlalchemy_database_uri


def test_production_with_sqlite_database_url_raises_error() -> None:
    """Verify that ENVIRONMENT=production raises ValueError when DATABASE_URL points to SQLite."""
    import pytest
    s = Settings(ENVIRONMENT="production", DATABASE_URL="sqlite:///backend/data/findit.db")
    with pytest.raises(ValueError, match="SQLite database URI cannot be used when ENVIRONMENT=production"):
        _ = s.sqlalchemy_database_uri


def test_production_with_valid_postgres_url_succeeds() -> None:
    """Verify that ENVIRONMENT=production succeeds when configured with PostgreSQL."""
    neon_url = "postgresql://test_user:secret@ep-sample.us-east-2.aws.neon.tech/neondb"
    s = Settings(ENVIRONMENT="production", DATABASE_URL=neon_url)
    assert s.is_postgres is True
    assert s.is_sqlite is False
    assert s.active_storage_mode == "postgresql"
    assert s.sqlalchemy_database_uri.startswith("postgresql+psycopg://")
    assert "sslmode=require" in s.sqlalchemy_database_uri


def test_database_url_quoted_and_prefixed_sanitization() -> None:
    """Verify that quotes, psql CLI prefixes, semicolons, and whitespace are cleanly sanitized."""
    from sqlalchemy.engine import make_url

    test_inputs = [
        "'postgresql://user:pass@ep-test.us-east-2.aws.neon.tech/neondb'",
        '"postgresql://user:pass@ep-test.us-east-2.aws.neon.tech/neondb"',
        "psql 'postgresql://user:pass@ep-test.us-east-2.aws.neon.tech/neondb?sslmode=require'",
        "  '  postgresql://user:pass@ep-test.us-east-2.aws.neon.tech/neondb  '  ",
        "'postgres://user:pass@ep-test.us-east-2.aws.neon.tech/neondb';",
    ]

    for raw in test_inputs:
        s = Settings(ENVIRONMENT="production", DATABASE_URL=raw)
        uri = s.sqlalchemy_database_uri
        assert uri.startswith("postgresql+psycopg://")
        assert "sslmode=require" in uri
        # Ensure SQLAlchemy can parse the sanitized URL without ArgumentError
        parsed = make_url(uri)
        assert parsed.drivername == "postgresql+psycopg"
