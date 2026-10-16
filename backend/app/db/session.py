"""Database engine, session factory, connection lifecycle, and diagnostic verification."""

import os
from typing import Generator, Tuple
from sqlalchemy import create_engine, text, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core.config import settings


def _create_configured_engine():
    """Create and configure SQLAlchemy Engine based on active dialect (SQLite or PostgreSQL)."""
    uri = settings.sqlalchemy_database_uri

    if settings.is_sqlite:
        # Guarantee parent directory exists for SQLite database file
        sqlite_path = settings.SQLITE_DB_PATH
        db_dir = os.path.dirname(os.path.abspath(sqlite_path))
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

        return create_engine(
            uri,
            connect_args={"check_same_thread": False},
        )
    else:
        # Pooled engine for Neon Cloud PostgreSQL or production instances
        return create_engine(
            uri,
            pool_pre_ping=settings.DB_POOL_PRE_PING,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_recycle=settings.DB_POOL_RECYCLE,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            connect_args={"connect_timeout": 10},
        )


# Global Engine and SessionLocal factory
engine = _create_configured_engine()

import sqlite3

# Configure SQLite PRAGMA for enforcing foreign key constraints
@event.listens_for(Engine, "connect")
def _enforce_sqlite_foreign_keys(dbapi_connection, connection_record):
    """Enable foreign key constraints exclusively on SQLite connections.

    Prevents PostgreSQL connections (psycopg 3) from executing SQLite-specific
    PRAGMA commands which would cause a syntax error, abort the PostgreSQL transaction,
    and raise InFailedSqlTransaction on subsequent queries.
    """
    if isinstance(dbapi_connection, sqlite3.Connection) or getattr(dbapi_connection, "__class__", type(None)).__module__.startswith("sqlite3"):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        except Exception:
            pass


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a managed database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _sanitize_db_error_message(message: str) -> str:
    """Mask sensitive credentials and connection strings from database diagnostics."""
    if not message:
        return ""
    import re
    sanitized = re.sub(r"://([^:/@]+):([^@]+)@", r"://\1:***@", str(message))
    sanitized = re.sub(r"(password=)[^&;\s]+", r"\1***", sanitized, flags=re.IGNORECASE)
    return sanitized


def check_db_connection() -> Tuple[bool, str]:
    """Verify actual database connectivity by executing a lightweight verification query.

    Returns:
        Tuple[bool, str]: (is_connected, detailed_status_message)
    """
    if engine is None:
        return False, "Database engine is not initialized"

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            return True, "connected"
    except OperationalError as e:
        detail = str(e.orig) if hasattr(e, "orig") and e.orig else str(e)
        sanitized = _sanitize_db_error_message(detail)
        return False, f"Database connection unavailable ({sanitized})"
    except SQLAlchemyError as e:
        sanitized = _sanitize_db_error_message(str(e))
        return False, f"Database error occurred: {sanitized}"
    except Exception as e:
        sanitized = _sanitize_db_error_message(str(e))
        return False, f"Unexpected database connection failure: {sanitized}"
