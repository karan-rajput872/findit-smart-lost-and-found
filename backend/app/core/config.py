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

    # CORS configuration
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://[::1]:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://[::1]:5173",
        ]


    # Primary Local SQLite Database Settings
    SQLITE_DB_PATH: str = os.path.join(_BASE_DIR, "data", "findit.db")

    # PostgreSQL Database Credentials (used if targeting local PostgreSQL)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "changethis_in_production"
    POSTGRES_DB: str = "findit_db"

    # Explicit Database URL override (e.g. from Neon Cloud PostgreSQL or custom SQLite)
    DATABASE_URL: Optional[str] = None

    @property
    def is_database_configured(self) -> bool:
        """Check whether a database connection URI is configured."""
        return True

    @property
    def is_postgres(self) -> bool:
        """Check whether PostgreSQL is the target dialect."""
        uri = self.sqlalchemy_database_uri
        return uri.startswith("postgresql") or uri.startswith("postgres")

    @property
    def is_sqlite(self) -> bool:
        """Check whether SQLite is the target dialect."""
        return self.sqlalchemy_database_uri.startswith("sqlite")

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

            # If explicitly pointing to SQLite
            if url.startswith("sqlite"):
                return url

            # Normalize URI schemes from cloud providers for psycopg 3
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
                url = url.replace("postgresql://", "postgresql+psycopg://", 1)

            # Ensure SSL mode is active for Neon or remote cloud PostgreSQL endpoints
            if ("neon.tech" in url or "amazonaws.com" in url or "aws" in url) and "sslmode=" not in url:
                delimiter = "&" if "?" in url else "?"
                url = f"{url}{delimiter}sslmode=require"

            return url

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
