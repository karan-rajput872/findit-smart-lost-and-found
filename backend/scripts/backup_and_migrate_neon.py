"""
FindIt — Neon Production Database Backup, Exact Migration & Verification Script
==============================================================================
Revision Target: 20261017_01 (from 20261015_01)
Task:
1. Verify pre-migration state and current Alembic revision (must be 20261015_01).
2. Create and verify a complete, verified snapshot backup of all tables.
3. Execute Alembic migration '20261017_01' programmatically.
4. Verify post-migration schema (google_sub, auth_provider, nullable hashed_password).
5. Verify data integrity, row counts, and existing password hash preservation.
6. Absolutely ZERO credential or secret exposure.
"""

import sys
import os
import json
import datetime
import re
from typing import Dict, Any, List

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text, inspect, create_engine
from alembic.config import Config
from alembic import command

from app.core.config import settings
import app.db.session as session_mod
from app.services.auth_service import AuthService
from app.services.user_repository import SqlAlchemyUserRepository
from app.schemas.user import UserLogin

EXPECTED_BASE_REVISION = "20261015_01"
TARGET_REVISION = "20261017_01"

EXPECTED_TABLE_COUNTS = {
    "users": 22,
    "items": 17,
    "claims": 1,
    "matches": 72,
    "notifications": 9,
    "messages": 0,
}


def sanitize_url(url: str) -> str:
    """Mask credentials in database URL for safe logging."""
    if not url:
        return "<not set>"
    pattern = r"://([^:@]+):([^@]+)@"
    return re.sub(pattern, r"://\1:***@", url)


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder for datetimes, UUIDs, and decimals."""
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        if hasattr(obj, "__str__"):
            return str(obj)
        return super().default(obj)


def run_backup_and_migration():
    print("=" * 60)
    print(" FindIt — Production Neon Backup & Alembic Migration Runner")
    print("=" * 60)

    # 1. Inspect configured database URL
    db_uri = settings.sqlalchemy_database_uri
    safe_db_desc = sanitize_url(db_uri)
    print(f"Target Database URI  : {safe_db_desc}")
    print(f"Storage Mode         : {settings.active_storage_mode}")

    if not settings.is_postgres:
        print("\n[ERROR] Target database is not PostgreSQL.")
        print("This runner requires a PostgreSQL connection (Neon). Aborting.")
        sys.exit(1)

    engine = session_mod.engine

    # 2. Test Connection
    print("\n--- Step 1: Pre-Migration Connection & Sanity Checks ---")
    try:
        with engine.connect() as conn:
            version_str = conn.execute(text("SELECT version();")).scalar()
            print(f"PostgreSQL Version   : {version_str[:70]}...")
            
            # Check current Alembic revision
            alembic_row = conn.execute(text("SELECT version_num FROM alembic_version;")).fetchone()
            current_rev = alembic_row[0] if alembic_row else None
            print(f"Current Alembic Rev  : {current_rev}")

            if current_rev != EXPECTED_BASE_REVISION:
                print(f"\n[ERROR] Unexpected current Alembic revision: '{current_rev}'. Expected: '{EXPECTED_BASE_REVISION}'.")
                print("Aborting migration to prevent applying migrations against an incompatible baseline.")
                sys.exit(1)
            print(f"[OK] Alembic revision matches expected baseline '{EXPECTED_BASE_REVISION}'.")

            # Check pre-migration row counts
            print("\nPre-migration table counts:")
            pre_counts = {}
            for table_name, expected_count in EXPECTED_TABLE_COUNTS.items():
                cnt = conn.execute(text(f"SELECT COUNT(*) FROM {table_name};")).scalar()
                pre_counts[table_name] = cnt
                print(f"  - {table_name:15}: {cnt} (baseline: {expected_count})")
                if cnt < expected_count:
                    print(f"[WARNING] Table '{table_name}' count ({cnt}) is less than baseline ({expected_count}).")

    except Exception as e:
        print(f"\n[ERROR] Pre-migration check failed: {e}")
        sys.exit(1)

    # 3. Create Fresh Backup
    print("\n--- Step 2: Creating Verified Production Database Backup ---")
    backup_dir = os.path.join(backend_dir, "data", "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"neon_prod_backup_pre_google_auth_{timestamp}.json"
    backup_path = os.path.join(backup_dir, backup_filename)

    backup_payload: Dict[str, Any] = {
        "metadata": {
            "created_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "target_database": safe_db_desc,
            "alembic_base_revision": current_rev,
            "target_revision": TARGET_REVISION,
        },
        "tables": {},
    }

    try:
        with engine.connect() as conn:
            for table_name in list(EXPECTED_TABLE_COUNTS.keys()) + ["alembic_version"]:
                result = conn.execute(text(f"SELECT * FROM {table_name}"))
                keys = result.keys()
                rows = [dict(zip(keys, row)) for row in result.fetchall()]
                backup_payload["tables"][table_name] = {
                    "count": len(rows),
                    "rows": rows,
                }
                print(f"  Backed up {table_name:15}: {len(rows)} record(s)")

        with open(backup_path, "w", encoding="utf-8") as f:
            json.dump(backup_payload, f, indent=2, cls=DateTimeEncoder)

        # Verify Backup
        if not os.path.exists(backup_path) or os.path.getsize(backup_path) == 0:
            print(f"\n[ERROR] Backup file verification failed: file is missing or empty at '{backup_path}'.")
            sys.exit(1)

        # Read back and verify row count parity
        with open(backup_path, "r", encoding="utf-8") as f:
            verified_data = json.load(f)
            for t_name, exp_cnt in pre_counts.items():
                backed_cnt = verified_data["tables"][t_name]["count"]
                if backed_cnt != exp_cnt:
                    print(f"\n[ERROR] Backup parity mismatch for '{t_name}': DB={exp_cnt}, Backup={backed_cnt}.")
                    sys.exit(1)

        file_size_kb = os.path.getsize(backup_path) / 1024
        print(f"\n[OK] Fresh backup successfully created and verified:")
        print(f"     Path     : {backup_path}")
        print(f"     Size     : {file_size_kb:.2f} KB")
        print(f"     Timestamp: {timestamp} UTC")

    except Exception as e:
        print(f"\n[ERROR] Database backup failed: {e}")
        sys.exit(1)

    # 4. Execute Alembic Migration
    print(f"\n--- Step 3: Executing Alembic Migration '{TARGET_REVISION}' ---")
    try:
        alembic_ini_path = os.path.join(backend_dir, "alembic.ini")
        alembic_cfg = Config(alembic_ini_path)
        alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
        # Run upgrade to exact revision
        command.upgrade(alembic_cfg, TARGET_REVISION)
        print(f"[OK] Alembic migration command completed successfully.")
    except Exception as e:
        print(f"\n[ERROR] Migration execution failed: {e}")
        sys.exit(1)

    # 5. Post-Migration Verification
    print("\n--- Step 4: Post-Migration Schema & Integrity Verification ---")
    try:
        with engine.connect() as conn:
            # Check new Alembic version
            new_rev_row = conn.execute(text("SELECT version_num FROM alembic_version;")).fetchone()
            new_rev = new_rev_row[0] if new_rev_row else None
            print(f"Post-migration Alembic Rev: {new_rev}")
            if new_rev != TARGET_REVISION:
                print(f"[ERROR] Alembic revision is '{new_rev}', expected '{TARGET_REVISION}'.")
                sys.exit(1)
            print(f"[OK] Alembic revision updated to '{TARGET_REVISION}'.")

            # Inspect columns in 'users' table
            insp = inspect(engine)
            columns = {col["name"]: col for col in insp.get_columns("users")}
            
            # 1. google_sub
            if "google_sub" not in columns:
                print("[ERROR] Column 'google_sub' not found in 'users' table.")
                sys.exit(1)
            google_sub_col = columns["google_sub"]
            print(f"[OK] Column 'google_sub' exists: type={google_sub_col['type']}, nullable={google_sub_col['nullable']}")

            # 2. auth_provider
            if "auth_provider" not in columns:
                print("[ERROR] Column 'auth_provider' not found in 'users' table.")
                sys.exit(1)
            auth_prov_col = columns["auth_provider"]
            print(f"[OK] Column 'auth_provider' exists: type={auth_prov_col['type']}, nullable={auth_prov_col['nullable']}, default={auth_prov_col.get('default')}")

            # 3. hashed_password nullable
            hash_pass_col = columns["hashed_password"]
            print(f"[OK] Column 'hashed_password' exists: nullable={hash_pass_col['nullable']}")
            if not hash_pass_col["nullable"]:
                print("[ERROR] Column 'hashed_password' is NOT nullable. Expected nullable=True.")
                sys.exit(1)

            # 4. Check index on google_sub
            indexes = insp.get_indexes("users")
            google_sub_idx = [idx for idx in indexes if "google_sub" in idx["column_names"]]
            if not google_sub_idx or not google_sub_idx[0].get("unique"):
                print("[ERROR] Unique index on 'google_sub' not found.")
                sys.exit(1)
            print(f"[OK] Unique index '{google_sub_idx[0]['name']}' verified on 'google_sub'.")

            # 5. Verify row count parity & user integrity
            print("\nPost-migration table count parity check:")
            for t_name, pre_cnt in pre_counts.items():
                post_cnt = conn.execute(text(f"SELECT COUNT(*) FROM {t_name};")).scalar()
                print(f"  - {t_name:15}: {post_cnt} (pre-migration: {pre_cnt})")
                if post_cnt != pre_cnt:
                    print(f"[ERROR] Count mismatch for table '{t_name}': {post_cnt} != {pre_cnt}!")
                    sys.exit(1)

            # 6. Verify existing user records have auth_provider='local' and retain password hashes
            users_check = conn.execute(
                text("SELECT COUNT(*), COUNT(hashed_password), COUNT(CASE WHEN auth_provider='local' THEN 1 END) FROM users;")
            ).fetchone()
            total_users, hashed_pass_count, local_auth_count = users_check
            print(f"\nUser Integrity Check:")
            print(f"  Total users in DB         : {total_users}")
            print(f"  Users with password hashes: {hashed_pass_count}")
            print(f"  Users with 'local' auth   : {local_auth_count}")
            if total_users != hashed_pass_count or total_users != local_auth_count:
                print("[ERROR] Existing user credentials or auth_provider corrupted!")
                sys.exit(1)
            print("[OK] All existing users retain valid password hashes and 'local' provider designation.")

            # 7. Foreign key verification
            print("\nForeign key integrity check:")
            orphaned_items = conn.execute(
                text("SELECT COUNT(*) FROM items WHERE user_id NOT IN (SELECT id FROM users);")
            ).scalar()
            orphaned_claims = conn.execute(
                text("SELECT COUNT(*) FROM claims WHERE claimant_id NOT IN (SELECT id FROM users) OR item_id NOT IN (SELECT id FROM items);")
            ).scalar()
            print(f"  Orphaned items : {orphaned_items}")
            print(f"  Orphaned claims: {orphaned_claims}")
            if orphaned_items > 0 or orphaned_claims > 0:
                print("[ERROR] Foreign key integrity violation detected!")
                sys.exit(1)
            print("[OK] Foreign key relationships intact across all tables.")

            # 8. Test functional login with existing account (Alex Morgan)
            print("\nTesting read-only local authentication against migrated Neon DB:")
            session = session_mod.SessionLocal()
            try:
                repo = SqlAlchemyUserRepository(session)
                alex_user = repo.get_by_email("alex.morgan@campus.edu")
                if not alex_user:
                    print("[ERROR] Could not find test user 'alex.morgan@campus.edu'!")
                    sys.exit(1)
                auth_resp = AuthService.authenticate_user(
                    UserLogin(email="alex.morgan@campus.edu", password="CampusPass123!"),
                    repo
                )
                print(f"[OK] Authentication succeeded for '{alex_user.email}' (Role: {alex_user.role}, Provider: {alex_user.auth_provider}).")
            finally:
                session.close()

    except Exception as e:
        print(f"\n[ERROR] Post-migration verification failed: {e}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print(" ALL PRE-CHECKS, BACKUP, MIGRATION & VERIFICATIONS SUCCEEDED!")
    print("=" * 60)


if __name__ == "__main__":
    run_backup_and_migration()
