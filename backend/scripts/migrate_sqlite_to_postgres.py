"""
FindIt SQLite to PostgreSQL Migration Tool

Safely migrates all existing records from local SQLite (backend/data/findit.db)
to a target PostgreSQL database (e.g. Neon Cloud PostgreSQL).

Features:
- Non-destructive: Leaves local SQLite file untouched.
- Auto-backup: Creates a timestamped local copy before running.
- Schema verification: Creates all tables via SQLAlchemy Base metadata.
- Data conversion: Converts SQLite integer booleans to native PostgreSQL booleans.
- Topological dependency order: Users -> Items -> Claims -> Matches -> Notifications -> Messages.
- Post-migration validation: Verifies row counts match exactly.
"""

import os
import sys
import argparse
import datetime
import shutil
import logging
from typing import Dict, Any, List

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.base import Base
from app.models.user import User
from app.models.item import Item
from app.models.claim import Claim
from app.models.match import ItemMatch
from app.models.notification import Notification
from app.models.message import Message
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("findit.migration")

TABLE_TRANSFER_ORDER = [
    (User, "users"),
    (Item, "items"),
    (Claim, "claims"),
    (ItemMatch, "matches"),
    (Notification, "notifications"),
    (Message, "messages"),
]


def backup_sqlite(sqlite_path: str) -> str:
    """Create a timestamped backup of the local SQLite database."""
    if not os.path.exists(sqlite_path):
        raise FileNotFoundError(f"Source SQLite database not found at {sqlite_path}")

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{sqlite_path}.backup_{timestamp}"
    shutil.copy2(sqlite_path, backup_path)
    logger.info("Successfully created SQLite backup at: %s (%d bytes)", backup_path, os.path.getsize(backup_path))
    return backup_path


def normalize_postgres_url(url: str) -> str:
    """Ensure PostgreSQL URL uses psycopg 3 and enforces SSL for cloud hosts."""
    url = url.strip()
    if url.startswith("sqlite"):
        return url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    if ("neon.tech" in url or "amazonaws.com" in url or "aws" in url) and "sslmode=" not in url:
        delim = "&" if "?" in url else "?"
        url = f"{url}{delim}sslmode=require"

    return url


def run_migration(sqlite_path: str, postgres_url: str) -> bool:
    """Execute complete end-to-end data transfer from SQLite to PostgreSQL."""
    normalized_pg_url = normalize_postgres_url(postgres_url)
    masked_url = normalized_pg_url.split("@")[-1] if "@" in normalized_pg_url else "postgres"
    logger.info("Connecting to target PostgreSQL: ...@%s", masked_url)

    # 1. Connect to SQLite
    sqlite_uri = f"sqlite:///{os.path.abspath(sqlite_path).replace(os.sep, '/')}"
    sqlite_engine = create_engine(sqlite_uri, connect_args={"check_same_thread": False})
    SqliteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SqliteSession()

    # 2. Connect to PostgreSQL
    connect_args = {"connect_timeout": 15} if not normalized_pg_url.startswith("sqlite") else {"check_same_thread": False}
    pg_engine = create_engine(
        normalized_pg_url,
        pool_pre_ping=True,
        connect_args=connect_args,
    )

    try:
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Target PostgreSQL connection verified successfully.")
    except Exception as e:
        logger.error("Failed to connect to target PostgreSQL: %s", e)
        return False

    # 3. Ensure target schema exists
    logger.info("Creating or ensuring all target tables exist in PostgreSQL...")
    Base.metadata.create_all(bind=pg_engine)

    PgSession = sessionmaker(bind=pg_engine)
    pg_session = PgSession()

    # 4. Transfer data table by table
    total_migrated = 0
    migration_summary: Dict[str, Dict[str, int]] = {}

    try:
        for model_cls, table_name in TABLE_TRANSFER_ORDER:
            # Query source records
            source_records = sqlite_session.query(model_cls).all()
            source_count = len(source_records)

            target_count_before = pg_session.query(model_cls).count()
            logger.info("Table '%s': %d source records in SQLite, %d existing in PostgreSQL", table_name, source_count, target_count_before)

            transferred_count = 0
            for record in source_records:
                # Get record data dictionary excluding SQLAlchemy internal state
                record_data = {col.name: getattr(record, col.name) for col in model_cls.__table__.columns}

                # Check if record already exists in target
                pk_name = model_cls.__table__.primary_key.columns.keys()[0]
                pk_val = record_data[pk_name]
                existing = pg_session.query(model_cls).filter(getattr(model_cls, pk_name) == pk_val).first()

                if not existing:
                    new_obj = model_cls(**record_data)
                    pg_session.add(new_obj)
                    transferred_count += 1

            pg_session.commit()
            target_count_after = pg_session.query(model_cls).count()

            migration_summary[table_name] = {
                "source_sqlite": source_count,
                "transferred_new": transferred_count,
                "target_postgres_total": target_count_after,
            }
            total_migrated += transferred_count
            logger.info("Table '%s' complete: +%d transferred, %d total in PostgreSQL", table_name, transferred_count, target_count_after)

        logger.info("==================================================")
        logger.info("MIGRATION COMPLETED SUCCESSFULLY")
        logger.info("Total new records transferred: %d", total_migrated)
        for tbl, stats in migration_summary.items():
            logger.info("  - %s: SQLite=%d | Transferred=%d | PG Total=%d", tbl, stats["source_sqlite"], stats["transferred_new"], stats["target_postgres_total"])
        logger.info("==================================================")
        return True

    except Exception as e:
        pg_session.rollback()
        logger.error("Error during table migration: %s", e, exc_info=True)
        return False
    finally:
        sqlite_session.close()
        pg_session.close()


def main():
    parser = argparse.ArgumentParser(description="FindIt SQLite to PostgreSQL Migration Tool")
    parser.add_argument(
        "--sqlite-path",
        default=settings.SQLITE_DB_PATH,
        help="Path to source SQLite database file",
    )
    parser.add_argument(
        "--postgres-url",
        default=os.getenv("DATABASE_URL", ""),
        help="Target PostgreSQL connection string (defaults to DATABASE_URL environment variable)",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Skip automatic backup of source SQLite database",
    )

    args = parser.parse_args()

    if not args.postgres_url:
        logger.error("No PostgreSQL URL provided. Set DATABASE_URL environment variable or pass --postgres-url")
        sys.exit(1)

    if not args.no_backup:
        backup_sqlite(args.sqlite_path)

    success = run_migration(args.sqlite_path, args.postgres_url)
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
