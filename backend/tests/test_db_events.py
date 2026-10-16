"""Tests for database connection events and dialect-specific behavior."""

import sqlite3
import pytest
from unittest.mock import MagicMock
from sqlalchemy import create_engine, text
from app.db.session import _enforce_sqlite_foreign_keys


def test_sqlite_connection_enables_foreign_keys():
    """Verify that SQLite connections trigger PRAGMA foreign_keys=ON."""
    engine = create_engine("sqlite:///:memory:")
    with engine.connect() as conn:
        fk_status = conn.execute(text("PRAGMA foreign_keys")).scalar()
        assert fk_status == 1, "Foreign keys should be enabled on SQLite connections"


def test_non_sqlite_connection_skips_pragma():
    """Verify that non-SQLite (e.g. psycopg 3) connections do NOT execute SQLite PRAGMA commands."""
    class MockPostgresDbapiConnection:
        def __init__(self):
            self.executed_statements = []

        def cursor(self):
            return self

        def execute(self, statement):
            self.executed_statements.append(statement)

        def close(self):
            pass

    mock_conn = MockPostgresDbapiConnection()
    # Call the event listener with the non-SQLite mock connection
    _enforce_sqlite_foreign_keys(mock_conn, None)

    assert len(mock_conn.executed_statements) == 0, (
        f"Non-SQLite connection should not execute PRAGMA, but executed: {mock_conn.executed_statements}"
    )


def test_session_rollback_resets_aborted_state():
    """Verify that rolling back a session clears any failed transaction state."""
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        # Intentionally cause a query error
        with pytest.raises(Exception):
            db.execute(text("SELECT * FROM non_existent_diagnostic_table"))

        # Rollback must restore session to working state
        db.rollback()

        # Subsequent query on the same session must now succeed
        result = db.execute(text("SELECT 1")).scalar()
        assert result == 1
    finally:
        db.close()
