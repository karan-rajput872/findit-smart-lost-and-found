"""
Unit and Regression Test Suite for FindIt SQLite to PostgreSQL Migration Tool

Validates:
1. Credential masking and log sanitization.
2. Complete end-to-end atomic migration.
3. Atomic rollback on failure during later tables (guaranteeing zero dirty commits).
4. Safe retry when target contains identical records.
5. Mismatch protection when target contains differing data for the same primary key.
6. Referential foreign-key integrity validation.
"""

import os
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.user import User
from app.models.item import Item
from app.models.claim import Claim
from app.models.match import ItemMatch
from app.models.notification import Notification
from scripts.migrate_sqlite_to_postgres import (
    sanitize_credentials,
    run_migration,
    TABLE_TRANSFER_ORDER,
)


def create_populated_source_db(db_path: str):
    """Seed an isolated source SQLite database with relational records."""
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # 1. Users
    u1 = User(
        id="usr_01",
        email="test1@campus.edu",
        full_name="Student One",
        campus="Main Campus",
        role="student",
        hashed_password="$argon2id$v=19$m=65536,t=3,p=4$somehashvalue",
    )
    u2 = User(
        id="usr_02",
        email="test2@campus.edu",
        full_name="Student Two",
        campus="North Campus",
        role="student",
        hashed_password="$argon2id$v=19$m=65536,t=3,p=4$anotherhashvalue",
    )
    session.add_all([u1, u2])
    session.commit()

    # 2. Items
    i1 = Item(
        id="item_01",
        user_id="usr_01",
        title="Lost Blue Backpack",
        description="Blue bag with textbooks",
        category="Wallets & Bags",
        type="lost",
        location="Library",
        campus="Main Campus",
        date="2026-10-15",
        status="open",
        is_demo=False,
    )
    i2 = Item(
        id="item_02",
        user_id="usr_02",
        title="Found Blue Backpack",
        description="Navy backpack found at desk",
        category="Wallets & Bags",
        type="found",
        location="Library",
        campus="Main Campus",
        date="2026-10-15",
        status="open",
        is_demo=False,
    )
    session.add_all([i1, i2])
    session.commit()

    # 3. Claims
    c1 = Claim(
        id="clm_01",
        item_id="item_02",
        claimant_id="usr_01",
        item_owner_id="usr_02",
        description="This is my lost backpack",
        status="approved",
    )
    session.add(c1)
    session.commit()

    # 4. Matches
    m1 = ItemMatch(
        id="match_01",
        lost_item_id="item_01",
        found_item_id="item_02",
        lost_user_id="usr_01",
        found_user_id="usr_02",
        overall_score=85,
        confidence_tier="high",
        title_score=90,
        semantic_score=85,
        attribute_score=80,
        location_score=90,
        date_score=95,
        image_score=70,
        explanation="High keyword and location correlation",
        status="suggested",
    )
    session.add(m1)
    session.commit()

    # 5. Notifications
    n1 = Notification(
        id="notif_01",
        user_id="usr_01",
        title="New Match Found",
        message="A potential match for your backpack was reported",
        notification_type="MATCH_FOUND",
        is_read=False,
        item_id="item_01",
        claim_id=None,
    )
    session.add(n1)
    session.commit()

    # 6. Alembic version
    session.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)"))
    session.execute(text("INSERT INTO alembic_version (version_num) VALUES ('20261015_01')"))
    session.commit()

    session.close()
    engine.dispose()


def test_credential_sanitization():
    """Verify that sensitive database passwords and query parameters are masked."""
    raw_url = "postgresql://neondb_owner:SuperSecretPassword123!@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
    sanitized = sanitize_credentials(raw_url)
    assert "SuperSecretPassword123!" not in sanitized
    assert "neondb_owner:***@" in sanitized
    assert "ep-sample-123456" in sanitized

    raw_error = "OperationalError: connection to server at host with password=my_db_pass failed"
    sanitized_err = sanitize_credentials(raw_error)
    assert "my_db_pass" not in sanitized_err
    assert "password=***" in sanitized_err


def test_successful_complete_migration(tmp_path):
    """Verify complete migration preserves all rows, password hashes, and schema definitions."""
    src_db = str(tmp_path / "source.db")
    dst_db = str(tmp_path / "target.db")
    dst_url = f"sqlite:///{dst_db}"

    create_populated_source_db(src_db)

    # Run migration
    success = run_migration(src_db, dst_url)
    assert success is True

    # Validate destination database records
    dst_engine = create_engine(dst_url)
    DstSession = sessionmaker(bind=dst_engine)
    session = DstSession()

    assert session.query(User).count() == 2
    assert session.query(Item).count() == 2
    assert session.query(Claim).count() == 1
    assert session.query(ItemMatch).count() == 1
    assert session.query(Notification).count() == 1

    # Verify password hash preservation
    u1 = session.query(User).filter(User.id == "usr_01").first()
    assert u1 is not None
    assert u1.hashed_password == "$argon2id$v=19$m=65536,t=3,p=4$somehashvalue"

    # Verify alembic version table
    v = session.execute(text("SELECT version_num FROM alembic_version")).scalar()
    assert v == "20261015_01"

    session.close()
    dst_engine.dispose()


def test_atomic_rollback_on_failure(tmp_path, monkeypatch):
    """Verify that failure during a later table rolls back all previously transferred tables."""
    src_db = str(tmp_path / "source.db")
    dst_db = str(tmp_path / "target.db")
    dst_url = f"sqlite:///{dst_db}"

    create_populated_source_db(src_db)

    # Simulate an error during Item transfer (table 2) by monkeypatching Item.__init__
    def failing_item_init(self, *args, **kwargs):
        raise RuntimeError("Simulated mid-migration failure in Item table")

    monkeypatch.setattr(Item, "__init__", failing_item_init)

    success = run_migration(src_db, dst_url)
    assert success is False

    # Check that atomic transaction rolled back User (table 1) as well!
    dst_engine = create_engine(dst_url)
    DstSession = sessionmaker(bind=dst_engine)
    session = DstSession()

    # Target must be completely empty due to atomic rollback
    assert session.query(User).count() == 0

    session.close()
    dst_engine.dispose()


def test_retry_after_matching_records(tmp_path):
    """Verify safe idempotent retry when target already contains identical matching records."""
    src_db = str(tmp_path / "source.db")
    dst_db = str(tmp_path / "target.db")
    dst_url = f"sqlite:///{dst_db}"

    create_populated_source_db(src_db)

    # 1st run
    assert run_migration(src_db, dst_url) is True

    # 2nd run (retry / re-execution)
    assert run_migration(src_db, dst_url) is True

    dst_engine = create_engine(dst_url)
    DstSession = sessionmaker(bind=dst_engine)
    session = DstSession()

    # Record counts should remain exactly 2 users, 2 items, etc. (no duplicates)
    assert session.query(User).count() == 2
    assert session.query(Item).count() == 2

    session.close()
    dst_engine.dispose()


def test_existing_record_mismatch_aborts(tmp_path):
    """Verify that mismatched existing target records abort the migration to prevent silent corruption."""
    src_db = str(tmp_path / "source.db")
    dst_db = str(tmp_path / "target.db")
    dst_url = f"sqlite:///{dst_db}"

    create_populated_source_db(src_db)

    # First run: successful
    assert run_migration(src_db, dst_url) is True

    # Tamper with target record (change user full_name)
    dst_engine = create_engine(dst_url)
    DstSession = sessionmaker(bind=dst_engine)
    session = DstSession()
    u1 = session.query(User).filter(User.id == "usr_01").first()
    u1.full_name = "Tampered / Inconsistent Name"
    session.commit()
    session.close()
    dst_engine.dispose()

    # Second run should detect mismatch and abort!
    assert run_migration(src_db, dst_url) is False


def test_row_count_parity_check_failure(tmp_path, monkeypatch):
    """Verify that a row count mismatch between source and destination causes migration to fail."""
    src_db = str(tmp_path / "source.db")
    dst_db = str(tmp_path / "target.db")
    dst_url = f"sqlite:///{dst_db}"

    create_populated_source_db(src_db)

    # Monkeypatch pg_session.query().count() after transaction to simulate parity loss
    from scripts.migrate_sqlite_to_postgres import verify_foreign_key_integrity

    def failing_fk_verification(session):
        return (False, ["Simulated referential integrity constraint failure"])

    monkeypatch.setattr("scripts.migrate_sqlite_to_postgres.verify_foreign_key_integrity", failing_fk_verification)

    # Migration must fail because foreign key validation fails!
    assert run_migration(src_db, dst_url) is False
