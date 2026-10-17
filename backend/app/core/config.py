"""Application configuration settings using Pydantic Settings."""

import os
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine base directory of backend project to locate .env reliably
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_ENV_FILE = os.path.join(_BASE_DIR, ".env")


class Settings(BaseSettings):
    """Centralized configuration for FindIt Backend application."""

    PROJECT_NAME: str = "FindIt API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # JWT Authentication Security Settings
    # NOTE: In production, configure JWT_SECRET_KEY via private backend/.env
    JWT_SECRET_KEY: str = "findit-dev-insecure-jwt-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Interactive documentation toggling for production
    ENABLE_DOCS: bool = True

    # CORS configuration
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://[::1]:5173",
        "https://findit-production.vercel.app",
        "https://findit-production-40x66glmq-priyanshukaran25-5139.vercel.app",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        import json
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    parsed = json.loads(v_str)
                    if isinstance(parsed, list):
                        return [str(i).strip().rstrip("/") for i in parsed if str(i).strip()]
                except Exception:
                    pass
            return [i.strip().rstrip("/") for i in v_str.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i).strip().rstrip("/") for i in v if str(i).strip()]
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://[::1]:5173",
            "https://findit-production.vercel.app",
            "https://findit-production-40x66glmq-priyanshukaran25-5139.vercel.app",
        ]


    # Primary Local SQLite Database Settings
    SQLITE_DB_PATH: str = os.path.join(_BASE_DIR, "data", "findit.db")

    # Persistent Image Uploads Directory Settings
    UPLOAD_DIR: str = os.path.join(_BASE_DIR, "data", "uploads")
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    ]

    # Cloudinary Persistent Cloud Object Storage (Recommended for Production)
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    CLOUDINARY_URL: Optional[str] = None

    @property
    def is_cloudinary_configured(self) -> bool:
        """Check whether Cloudinary cloud credentials are configured."""
        return bool(
            self.CLOUDINARY_URL
            or (self.CLOUDINARY_CLOUD_NAME and self.CLOUDINARY_API_KEY and self.CLOUDINARY_API_SECRET)
        )

    # PostgreSQL Database Credentials (used if targeting local PostgreSQL)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "changethis_in_production"
    POSTGRES_DB: str = "findit_db"

    # Explicit Database URL override (e.g. from Neon Cloud PostgreSQL or custom SQLite)
    DATABASE_URL: Optional[str] = None

    # Database Connection Pool Settings (for PostgreSQL / Neon)
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 300
    DB_POOL_PRE_PING: bool = True

    @property
    def is_database_configured(self) -> bool:
        """Check whether a database connection URI is configured."""
        return True

    @property
    def is_postgres(self) -> bool:
        """Check whether PostgreSQL is the target dialect."""
        try:
            uri = self.sqlalchemy_database_uri
            return uri.startswith("postgresql") or uri.startswith("postgres")
        except Exception:
            return False

    @property
    def is_sqlite(self) -> bool:
        """Check whether SQLite is the target dialect."""
        try:
            return self.sqlalchemy_database_uri.startswith("sqlite")
        except Exception:
            return False

    @property
    def active_storage_mode(self) -> str:
        """Return the active data storage layer designation."""
        if self.is_postgres:
            return "postgresql"
        return "sqlite"

    @property
    def sqlalchemy_database_uri(self) -> str:
        """Return the active SQLAlchemy database connection string.

        Defaults to local persistent SQLite (backend/data/findit.db).
        If DATABASE_URL is set (e.g. Neon Cloud PostgreSQL), normalizes
        driver to psycopg (v3) and enforces required SSL modes.
        """
        if self.DATABASE_URL and self.DATABASE_URL.strip():
            url = self.DATABASE_URL.strip()

            # Strip accidental CLI copy command e.g. "psql 'postgresql://...'"
            if url.startswith("psql "):
                url = url[5:].strip()

            # Strip any enclosing quotes, backticks, and trailing semicolons
            changed = True
            while changed:
                changed = False
                url = url.strip().rstrip(";").strip()
                if len(url) >= 2:
                    if url[0] == url[-1] and url[0] in ("'", '"', '`'):
                        url = url[1:-1].strip()
                        changed = True
                    elif url.startswith(r'\"') and url.endswith(r'\"'):
                        url = url[2:-2].strip()
                        changed = True
                    elif url.startswith(r"\'") and url.endswith(r"\'"):
                        url = url[2:-2].strip()
                        changed = True
            url = url.strip().rstrip(";").strip()

            # If explicitly pointing to SQLite
            if url.startswith("sqlite"):
                if self.ENVIRONMENT.lower() == "production":
                    raise ValueError(
                        "SQLite database URI cannot be used when ENVIRONMENT=production. "
                        "Configure a valid PostgreSQL DATABASE_URL (e.g. Neon Cloud PostgreSQL)."
                    )
                return url

            # Normalize URI schemes from cloud providers for psycopg 3
            if url.startswith("postgres://"):
                url = "postgresql+psycopg://" + url[len("postgres://"):]
            elif url.startswith("postgresql+psycopg2://"):
                url = "postgresql+psycopg://" + url[len("postgresql+psycopg2://"):]
            elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
                url = "postgresql+psycopg://" + url[len("postgresql://"):]

            # Ensure SSL mode is active for Neon or remote cloud PostgreSQL endpoints
            is_cloud_host = (
                "neon.tech" in url
                or "amazonaws.com" in url
                or "aws" in url
                or "render.com" in url
                or "onrender.com" in url
                or (self.ENVIRONMENT.lower() == "production" and "localhost" not in url and "127.0.0.1" not in url)
            )
            if is_cloud_host and "sslmode=" not in url:
                delimiter = "&" if "?" in url else "?"
                url = f"{url}{delimiter}sslmode=require"

            return url

        if self.ENVIRONMENT.lower() == "production":
            raise ValueError(
                "DATABASE_URL environment variable must be configured when ENVIRONMENT=production. "
                "Silent fallback to SQLite in production is disabled to protect against ephemeral data loss."
            )

        # Safe local development default: persistent file-based SQLite
        sqlite_file = os.path.abspath(self.SQLITE_DB_PATH).replace("\\", "/")
        return f"sqlite:///{sqlite_file}"

    model_config = SettingsConfigDict(
        env_file=(".env", _ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
