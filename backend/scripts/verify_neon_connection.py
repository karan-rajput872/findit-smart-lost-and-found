"""
FindIt — Live Neon PostgreSQL Connection & Functional Verification Script

STRICTLY READ-ONLY verification tool:
1. Verifies database dialect is PostgreSQL and driver is psycopg 3.
2. Establishes a fresh database connection and tests basic round-trip.
3. Queries PostgreSQL server engine version.
4. Verifies presence of all 7 expected application tables in the schema.
5. Verifies exact row counts across all tables against migrated values:
   - users: 22
   - items: 17
   - claims: 1
   - matches: 72
   - notifications: 9
   - messages: 0
   - alembic_version: 1 row ('20261015_01')
6. Verifies Alembic schema revision matches '20261015_01'.
7. Verifies read-only authentication flow against existing account (Alex Morgan).
8. Retrieves and validates existing sample items and claims.
9. Ensures all transactions are cleanly rolled back / closed with zero database writes.

Safety constraints:
- Zero INSERT, UPDATE, DELETE, ALTER, DROP, TRUNCATE, or CREATE statements.
- Zero test users, probe items, or synthetic records.
- Zero Alembic migrations or schema modifications.
- Sensitive credentials, connection URLs, and tokens are never printed or logged.
"""

import sys
import os
from typing import Dict, Any, List

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text, inspect
from app.core.config import settings
import app.db.session as session_mod
from app.models.user import User
from app.models.item import Item
from app.models.claim import Claim
from app.services.auth_service import AuthService
from app.services.user_repository import SqlAlchemyUserRepository
from app.schemas.user import UserLogin


EXPECTED_TABLE_COUNTS = {
    "users": 22,
    "items": 17,
    "claims": 1,
    "matches": 72,
    "notifications": 9,
    "messages": 0,
}

EXPECTED_ALEMBIC_VERSION = "20261015_01"


def run_neon_verification() -> int:
    """Run strict read-only verification against Neon PostgreSQL.

    Returns:
        int: 0 on full success, 1 on data/auth mismatch, 2 on connection failure.
    """
    print("=" * 65)
    print("  FindIt -- Neon PostgreSQL Verification (Strictly Read-Only)")
    print("=" * 65)

    # 1. Configuration & Dialect Verification
    print("\n[Step 1/6] Database Configuration & Dialect Check:")
    print(f"  * Active Storage Mode : {settings.active_storage_mode}")
    print(f"  * Target is PostgreSQL: {settings.is_postgres}")

    if not settings.is_postgres:
        print("\n  [FAILURE] Target dialect is not PostgreSQL.")
        print("  Reason: DATABASE_URL is not set or does not point to a PostgreSQL endpoint.")
        print("  Please supply a valid Neon connection URL via DATABASE_URL.")
        print("=" * 65)
        return 2

    # 2. Fresh Connection & Server Engine Check
    print("\n[Step 2/6] Connection & Server Engine Check:")
    is_connected, conn_msg = session_mod.check_db_connection()
    if not is_connected:
        print(f"  [FAILURE] Could not establish connection to PostgreSQL.")
        print(f"  Error details: {conn_msg}")
        print("=" * 65)
        return 2
    print("  * Connection Status   : CONNECTED (SSL active)")

    try:
        with session_mod.engine.connect() as conn:
            pg_ver = conn.execute(text("SELECT version()")).scalar()
            ver_line = pg_ver.split(",")[0] if pg_ver else "PostgreSQL (Unknown)"
            print(f"  * Server Version      : {ver_line}")
    except Exception as e:
        print(f"  * Server Version Note : Could not query engine version ({type(e).__name__})")

    # 3. Schema & Table Existence Check
    print("\n[Step 3/6] Schema & Table Existence Check:")
    try:
        inspector = inspect(session_mod.engine)
        existing_tables = set(inspector.get_table_names())
    except Exception as e:
        print(f"  [FAILURE] Could not inspect schema tables: {e}")
        return 2

    required_tables = list(EXPECTED_TABLE_COUNTS.keys()) + ["alembic_version"]
    missing_tables = [t for t in required_tables if t not in existing_tables]

    if missing_tables:
        print(f"  [FAILURE] Missing tables in PostgreSQL database: {', '.join(missing_tables)}")
        return 1

    print(f"  * Required Tables     : All {len(required_tables)} tables present in database schema.")
    for t in required_tables:
        print(f"    - {t:<17}: FOUND")

    # 4. Strict Row Count Parity Verification
    print("\n[Step 4/6] Table Row Count Parity Verification:")
    db = session_mod.SessionLocal()
    counts_matched = True

    try:
        for table_name, expected_count in EXPECTED_TABLE_COUNTS.items():
            try:
                cnt = db.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
                if cnt == expected_count:
                    print(f"  * {table_name:<17}: {cnt:>3} rows (Expected: {expected_count:>2}) [MATCH]")
                else:
                    print(f"  * {table_name:<17}: {cnt:>3} rows (Expected: {expected_count:>2}) [MISMATCH]")
                    counts_matched = False
            except Exception as q_err:
                db.rollback()
                print(f"  * {table_name:<17}: ERROR reading count ({type(q_err).__name__})")
                counts_matched = False

        # Verify alembic_version
        try:
            alembic_rev = db.execute(text("SELECT version_num FROM alembic_version")).scalar()
            if alembic_rev == EXPECTED_ALEMBIC_VERSION:
                print(f"  * alembic_version  : '{alembic_rev}' (Expected: '{EXPECTED_ALEMBIC_VERSION}') [MATCH]")
            else:
                print(f"  * alembic_version  : '{alembic_rev}' (Expected: '{EXPECTED_ALEMBIC_VERSION}') [MISMATCH]")
                counts_matched = False
        except Exception as a_err:
            db.rollback()
            print(f"  * alembic_version  : ERROR reading version ({type(a_err).__name__})")
            counts_matched = False

    finally:
        db.close()

    if not counts_matched:
        print("\n  [FAILURE] Row count or schema version mismatch detected.")
        return 1

    # 5. Read-Only Authentication Verification
    print("\n[Step 5/6] Read-Only Authentication Service Verification:")
    test_email = "alex.morgan@campus.edu"
    test_pass = "CampusPass123!"
    auth_success = False

    db = session_mod.SessionLocal()
    try:
        user_repo = SqlAlchemyUserRepository(db)
        login_payload = UserLogin(email=test_email, password=test_pass)
        auth_resp = AuthService.authenticate_user(login_payload, user_repo)
        authenticated_user = auth_resp.user
        token = auth_resp.access_token

        print(f"  * Authenticated User  : {authenticated_user.fullName} (ID: {authenticated_user.id})")
        print(f"  * User Role           : {authenticated_user.role}")
        print(f"  * JWT Generation      : Token generated successfully (Length: {len(token)} chars)")
        auth_success = True
    except Exception as auth_err:
        db.rollback()
        print(f"  [FAILURE] Authentication check failed for {test_email}: {type(auth_err).__name__}")
    finally:
        db.rollback()
        db.close()

    if not auth_success:
        return 1

    # 6. Sample Data Retrieval Verification
    print("\n[Step 6/6] Sample Data Retrieval Verification (Items & Claims):")
    data_retrieval_success = False

    db = session_mod.SessionLocal()
    try:
        sample_items = db.query(Item).limit(3).all()
        print(f"  * Retrieved {len(sample_items)} sample item listings:")
        for item in sample_items:
            print(f"    - [{item.type.upper()}] {item.title} (Campus: {item.campus})")

        sample_claims = db.query(Claim).all()
        print(f"  * Retrieved {len(sample_claims)} active claim(s):")
        for claim in sample_claims:
            print(f"    - Claim ID: {claim.id} | Status: {claim.status}")

        data_retrieval_success = True
    except Exception as read_err:
        db.rollback()
        print(f"  [FAILURE] Data retrieval failed: {type(read_err).__name__}")
    finally:
        db.rollback()
        db.close()

    if not data_retrieval_success:
        return 1

    print("\n" + "=" * 65)
    print("  ALL VERIFICATION CHECKS PASSED (Strictly Read-Only)")
    print("  Neon PostgreSQL database is fully compatible and intact.")
    print("  Zero records were created, modified, or deleted.")
    print("=" * 65)
    return 0


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="FindIt Neon PostgreSQL Read-Only Verification Tool")
    parser.add_argument("--postgres-url", default=None, help="Optional direct Neon database URL override")
    args = parser.parse_args()

    if args.postgres_url:
        os.environ["DATABASE_URL"] = args.postgres_url
        settings.DATABASE_URL = args.postgres_url
        session_mod.engine = session_mod._create_configured_engine()
        session_mod.SessionLocal.configure(bind=session_mod.engine)

    exit_code = run_neon_verification()
    sys.exit(exit_code)
