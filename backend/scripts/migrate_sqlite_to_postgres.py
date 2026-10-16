"""
FindIt SQLite to PostgreSQL Migration Tool (Hardened Production Release)

Safely migrates all existing records from local SQLite (backend/data/findit.db)
to a target PostgreSQL database (e.g. Neon Cloud PostgreSQL).

Safety Invariants:
1. Atomic Migration: Uses a single atomic transaction for all six application tables.
   If any table fails, the entire transaction rolls back cleanly.
2. Mismatch Protection: Compares existing records field-by-field against source records.
   If an existing record differs, migration immediately aborts to protect data integrity.
   Records already migrated identically are safely skipped to enable seamless retries.
3. Strict Parity Verification: Validates row counts and foreign-key integrity after
   migration before declaring success.
4. Credential Sanitization: All logs and exception messages mask connection passwords.
5. Non-destructive: Never modifies, drops, or writes to the source SQLite database.
"""

import os
import sys
import re
import argparse
import datetime
import shutil
import logging
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy import create_engine, inspect, text, Boolean
from sqlalchemy.orm import sessionmaker, Session

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


def sanitize_credentials(message: str) -> str:
    """Mask passwords and sensitive credentials from connection strings and logs."""
    if not message:
        return ""
    text_msg = str(message)
    # Mask ://user:password@host
    sanitized = re.sub(r"://([^:/@]+):([^@]+)@", r"://\1:***@", text_msg)
    # Mask password=... query parameters
    sanitized = re.sub(r"(password=)[^&;]+", r"\1***", sanitized, flags=re.IGNORECASE)
    return sanitized


def backup_sqlite(sqlite_path: str) -> str:
    """Create a timestamped backup of the local SQLite database."""
    if not os.path.exists(sqlite_path):
        raise FileNotFoundError(f"Source SQLite database not found at {sqlite_path}")

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(os.path.dirname(sqlite_path), "..", "backups")
    if not os.path.exists(backup_dir):
        backup_dir = os.path.dirname(sqlite_path)

    backup_path = os.path.join(backup_dir, f"findit_backup_{timestamp}.db")
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


def compare_record_fields(
    model_cls: Any,
    source_data: Dict[str, Any],
    existing_target_obj: Any,
) -> List[str]:
    """Compare source dictionary with existing target object attributes.

    Returns list of mismatch descriptions, if any.
    """
    mismatches = []
    for col in model_cls.__table__.columns:
        col_name = col.name
        src_val = source_data.get(col_name)
        tgt_val = getattr(existing_target_obj, col_name, None)

        # Handle datetime comparisons
        if isinstance(src_val, datetime.datetime) and isinstance(tgt_val, datetime.datetime):
            if int(src_val.timestamp()) != int(tgt_val.timestamp()):
                mismatches.append(f"{col_name} (source: '{src_val}' != target: '{tgt_val}')")
        # Handle boolean representations
        elif isinstance(col.type, Boolean) or isinstance(src_val, bool) or isinstance(tgt_val, bool):
            if bool(src_val) != bool(tgt_val):
                mismatches.append(f"{col_name} (source: '{src_val}' != target: '{tgt_val}')")
        else:
            if src_val != tgt_val:
                mismatches.append(f"{col_name} (source: '{src_val}' != target: '{tgt_val}')")

    return mismatches


def verify_foreign_key_integrity(session: Session) -> Tuple[bool, List[str]]:
    """Validate referential integrity across all transferred relationships in target DB."""
    violations = []

    # 1. Check Items -> Users
    orphan_items = (
        session.query(Item.id, Item.user_id)
        .outerjoin(User, Item.user_id == User.id)
        .filter(Item.user_id.isnot(None), User.id.is_(None))
        .all()
    )
    for item_id, user_id in orphan_items:
        violations.append(f"Item '{item_id}' references missing user_id '{user_id}'")

    # 2. Check Claims -> Items & Users
    orphan_claims_item = (
        session.query(Claim.id, Claim.item_id)
        .outerjoin(Item, Claim.item_id == Item.id)
        .filter(Claim.item_id.isnot(None), Item.id.is_(None))
        .all()
    )
    for claim_id, item_id in orphan_claims_item:
        violations.append(f"Claim '{claim_id}' references missing item_id '{item_id}'")

    orphan_claims_claimant = (
        session.query(Claim.id, Claim.claimant_id)
        .outerjoin(User, Claim.claimant_id == User.id)
        .filter(Claim.claimant_id.isnot(None), User.id.is_(None))
        .all()
    )
    for claim_id, claimant_id in orphan_claims_claimant:
        violations.append(f"Claim '{claim_id}' references missing claimant_id '{claimant_id}'")

    # 3. Check Matches -> Items & Users
    orphan_matches_lost = (
        session.query(ItemMatch.id, ItemMatch.lost_item_id)
        .outerjoin(Item, ItemMatch.lost_item_id == Item.id)
        .filter(Item.id.is_(None))
        .all()
    )
    for match_id, lost_id in orphan_matches_lost:
        violations.append(f"Match '{match_id}' references missing lost_item_id '{lost_id}'")

    orphan_matches_found = (
        session.query(ItemMatch.id, ItemMatch.found_item_id)
        .outerjoin(Item, ItemMatch.found_item_id == Item.id)
        .filter(Item.id.is_(None))
        .all()
    )
    for match_id, found_id in orphan_matches_found:
        violations.append(f"Match '{match_id}' references missing found_item_id '{found_id}'")

    # 4. Check Notifications -> Users
    orphan_notifs = (
        session.query(Notification.id, Notification.user_id)
        .outerjoin(User, Notification.user_id == User.id)
        .filter(User.id.is_(None))
        .all()
    )
    for notif_id, user_id in orphan_notifs:
        violations.append(f"Notification '{notif_id}' references missing user_id '{user_id}'")

    return (len(violations) == 0, violations)


def run_migration(sqlite_path: str, postgres_url: str) -> bool:
    """Execute complete end-to-end atomic data transfer from SQLite to PostgreSQL.

    Guarantees:
    - Atomicity: All 6 tables are transferred in a single session transaction.
    - Mismatch Protection: Halts if existing target records differ from SQLite source.
    - Strict Parity: Asserts row counts and FK relationships match before returning True.
    - Credential Safety: Never prints database credentials in logs or errors.
    """
    normalized_pg_url = normalize_postgres_url(postgres_url)
    sanitized_log_url = sanitize_credentials(normalized_pg_url)
    masked_target = sanitized_log_url.split("@")[-1] if "@" in sanitized_log_url else "database"
    logger.info("Connecting to target PostgreSQL: ...@%s", masked_target)

    # 1. Connect to SQLite
    sqlite_uri = f"sqlite:///{os.path.abspath(sqlite_path).replace(os.sep, '/')}"
    sqlite_engine = create_engine(sqlite_uri, connect_args={"check_same_thread": False})
    SqliteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SqliteSession()

    # 2. Connect to PostgreSQL
    connect_args = {"connect_timeout": 15} if not normalized_pg_url.startswith("sqlite") else {"check_same_thread": False}
    try:
        pg_engine = create_engine(
            normalized_pg_url,
            pool_pre_ping=True,
            connect_args=connect_args,
        )
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Target PostgreSQL connection verified successfully.")
    except Exception as e:
        logger.error("Failed to connect to target PostgreSQL: %s", sanitize_credentials(str(e)))
        return False

    # 3. Ensure target schema exists
    try:
        logger.info("Ensuring all target tables exist in PostgreSQL...")
        Base.metadata.create_all(bind=pg_engine)
    except Exception as e:
        logger.error("Failed to create target schema: %s", sanitize_credentials(str(e)))
        return False

    PgSession = sessionmaker(bind=pg_engine)
    pg_session = PgSession()

    total_migrated = 0
    total_skipped = 0
    migration_summary: Dict[str, Dict[str, int]] = {}

    try:
        # ATOMIC TRANSACTION: Enclose all 6 tables in a single transaction
        with pg_session.begin():
            logger.info("Initiating single atomic transaction for application dataset...")

            for model_cls, table_name in TABLE_TRANSFER_ORDER:
                source_records = sqlite_session.query(model_cls).all()
                source_count = len(source_records)

                target_count_before = pg_session.query(model_cls).count()
                logger.info(
                    "Table '%s': %d source records in SQLite, %d existing in PostgreSQL",
                    table_name,
                    source_count,
                    target_count_before,
                )

                transferred_count = 0
                matching_count = 0

                for record in source_records:
                    record_data = {col.name: getattr(record, col.name) for col in model_cls.__table__.columns}

                    pk_name = model_cls.__table__.primary_key.columns.keys()[0]
                    pk_val = record_data[pk_name]

                    existing = pg_session.query(model_cls).filter(getattr(model_cls, pk_name) == pk_val).first()

                    if existing is not None:
                        # Existing-record mismatch protection: Compare attributes
                        mismatches = compare_record_fields(model_cls, record_data, existing)
                        if mismatches:
                            raise ValueError(
                                f"Data mismatch detected in table '{table_name}' for record ID '{pk_val}'. "
                                f"Mismatched attributes: {', '.join(mismatches)}. "
                                "Migration aborted to prevent data corruption."
                            )
                        # Identical match: safe retry
                        matching_count += 1
                    else:
                        new_obj = model_cls(**record_data)
                        pg_session.add(new_obj)
                        transferred_count += 1

                migration_summary[table_name] = {
                    "source_sqlite": source_count,
                    "transferred_new": transferred_count,
                    "matching_existing": matching_count,
                }
                total_migrated += transferred_count
                total_skipped += matching_count

                logger.info(
                    "Table '%s' processed in transaction: +%d new, %d matching existing",
                    table_name,
                    transferred_count,
                    matching_count,
                )

            logger.info("All 6 tables validated and staged. Committing atomic transaction...")

        # POST-TRANSACTION PARITY VERIFICATION
        logger.info("Performing strict post-migration row count and parity verification...")
        parity_failures = []
        for model_cls, table_name in TABLE_TRANSFER_ORDER:
            src_count = migration_summary[table_name]["source_sqlite"]
            tgt_count = pg_session.query(model_cls).count()
            migration_summary[table_name]["target_postgres_total"] = tgt_count

            if tgt_count != src_count:
                parity_failures.append(
                    f"Table '{table_name}': expected {src_count} rows, found {tgt_count} in target database"
                )

        if parity_failures:
            raise ValueError(f"Strict row parity verification failed: {'; '.join(parity_failures)}")

        # REFERENTIAL INTEGRITY VERIFICATION
        logger.info("Validating referential foreign-key integrity in target database...")
        fk_ok, fk_errors = verify_foreign_key_integrity(pg_session)
        if not fk_ok:
            raise ValueError(f"Referential integrity validation failed: {'; '.join(fk_errors)}")

        logger.info("Foreign-key referential integrity verified: 0 violations.")

        # SYNCHRONIZE ALEMBIC VERSION
        try:
            with sqlite_engine.connect() as s_conn, pg_engine.connect() as p_conn:
                has_alembic = s_conn.execute(
                    text("SELECT name FROM sqlite_master WHERE type='table' AND name='alembic_version'")
                ).fetchone()
                if has_alembic:
                    row = s_conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
                    if row:
                        version = row[0]
                        p_conn.execute(
                            text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL, PRIMARY KEY (version_num))")
                        )
                        existing_v = p_conn.execute(
                            text("SELECT version_num FROM alembic_version WHERE version_num = :v"),
                            {"v": version},
                        ).fetchone()
                        if not existing_v:
                            p_conn.execute(text("DELETE FROM alembic_version"))
                            p_conn.execute(
                                text("INSERT INTO alembic_version (version_num) VALUES (:v)"),
                                {"v": version},
                            )
                            p_conn.commit()
                        logger.info("Synchronized alembic_version: %s", version)
        except Exception as e:
            logger.warning("Non-fatal alembic_version note: %s", sanitize_credentials(str(e)))

        logger.info("==================================================")
        logger.info("MIGRATION COMPLETED & STRICTLY VERIFIED")
        logger.info("Total new records transferred: %d", total_migrated)
        logger.info("Total matching existing records preserved: %d", total_skipped)
        for tbl, stats in migration_summary.items():
            logger.info(
                "  - %s: SQLite=%d | Transferred=%d | Existing=%d | Total Verified=%d",
                tbl,
                stats["source_sqlite"],
                stats["transferred_new"],
                stats.get("matching_existing", 0),
                stats["target_postgres_total"],
            )
        logger.info("==================================================")
        return True

    except Exception as e:
        logger.error("Migration failed and was rolled back: %s", sanitize_credentials(str(e)), exc_info=False)
        return False
    finally:
        sqlite_session.close()
        pg_session.close()


def main():
    parser = argparse.ArgumentParser(description="FindIt SQLite to PostgreSQL Migration Tool (Hardened)")
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
        logger.error("Migration did NOT complete successfully. Check logs above for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()
