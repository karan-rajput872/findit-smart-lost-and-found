"""
FindIt — Comprehensive Tests for Neon Verification Workflow, Path Resolution,
Security Cleanup, and Dialect Event Handling.
"""

import os
import sys
import ast
import sqlite3
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy import create_engine, text

from app.db.session import _enforce_sqlite_foreign_keys, SessionLocal
from app.core.config import settings
from app.schemas.user import UserResponse, TokenResponse
import scripts.verify_neon_connection as verify_script


def test_sqlite_foreign_key_pragma_active():
    """Verify that SQLite connections enable foreign key enforcement."""
    engine = create_engine("sqlite:///:memory:")
    with engine.connect() as conn:
        val = conn.execute(text("PRAGMA foreign_keys")).scalar()
        assert val == 1, "SQLite foreign keys must be active (PRAGMA foreign_keys=1)"


def test_postgres_connection_bypasses_sqlite_pragma():
    """Verify that non-SQLite (e.g. PostgreSQL psycopg) connections do NOT execute SQLite PRAGMA."""
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
    _enforce_sqlite_foreign_keys(mock_conn, None)

    assert len(mock_conn.executed_statements) == 0, (
        f"Non-SQLite connection should not execute PRAGMA, but executed: {mock_conn.executed_statements}"
    )


def test_session_rollback_resets_aborted_transaction():
    """Verify that calling rollback on a session after an exception clears aborted transaction state."""
    db = SessionLocal()
    try:
        with pytest.raises(Exception):
            db.execute(text("SELECT * FROM non_existent_table_for_rollback_test"))

        # In PostgreSQL and SQLAlchemy, rollback restores session
        db.rollback()

        result = db.execute(text("SELECT 1")).scalar()
        assert result == 1, "Session should execute queries successfully after rollback"
    finally:
        db.close()


def test_verification_script_source_has_zero_write_operations():
    """Verify by AST inspection that verify_neon_connection.py contains no write or destructive operations."""
    script_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "verify_neon_connection.py")
    with open(script_path, "r", encoding="utf-8") as f:
        source_code = f.read()

    tree = ast.parse(source_code)

    # Check that no method calls invoke commit(), delete(), or add()
    called_methods = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            called_methods.append(node.func.attr)

    forbidden_methods = ["commit", "add", "delete"]
    for m in forbidden_methods:
        assert m not in called_methods, f"Verification script must not call mutation method '{m}()'"


def test_verification_script_handles_connection_failure_cleanly():
    """Verify that run_neon_verification returns exit code 2 on connection failure without exposing secrets."""
    original_url = settings.DATABASE_URL
    try:
        settings.DATABASE_URL = "postgresql://test_user:test_pass@ep-sample-123.us-east-2.aws.neon.tech/findit_db"
        with patch("scripts.verify_neon_connection.session_mod.check_db_connection") as mock_conn:
            mock_conn.return_value = (False, "Connection to host 'neon-sample.tech' refused")
            exit_code = verify_script.run_neon_verification()
            assert exit_code == 2, f"Expected exit code 2 on connection failure, got {exit_code}"
    finally:
        settings.DATABASE_URL = original_url


def test_verification_script_handles_missing_tables_cleanly():
    """Verify that run_neon_verification returns exit code 1 if required tables are missing."""
    original_url = settings.DATABASE_URL
    try:
        settings.DATABASE_URL = "postgresql://test_user:test_pass@ep-sample-123.us-east-2.aws.neon.tech/findit_db"
        with patch("scripts.verify_neon_connection.session_mod.check_db_connection", return_value=(True, "connected")):
            with patch("scripts.verify_neon_connection.inspect") as mock_inspect:
                mock_inspector = MagicMock()
                # Simulate only users table present, missing items, claims, etc.
                mock_inspector.get_table_names.return_value = ["users"]
                mock_inspect.return_value = mock_inspector

                exit_code = verify_script.run_neon_verification()
                assert exit_code == 1, f"Expected exit code 1 on missing tables, got {exit_code}"
    finally:
        settings.DATABASE_URL = original_url


def test_verification_script_handles_row_count_mismatch():
    """Verify that run_neon_verification returns exit code 1 if table row counts differ from expected."""
    original_url = settings.DATABASE_URL
    try:
        settings.DATABASE_URL = "postgresql://test_user:test_pass@ep-sample-123.us-east-2.aws.neon.tech/findit_db"
        with patch("scripts.verify_neon_connection.session_mod.check_db_connection", return_value=(True, "connected")):
            with patch("scripts.verify_neon_connection.inspect") as mock_inspect:
                mock_inspector = MagicMock()
                mock_inspector.get_table_names.return_value = list(verify_script.EXPECTED_TABLE_COUNTS.keys()) + ["alembic_version"]
                mock_inspect.return_value = mock_inspector

                with patch("scripts.verify_neon_connection.session_mod.SessionLocal") as mock_session_maker:
                    mock_session = MagicMock()
                    # Return 0 rows for users instead of expected 22
                    mock_session.execute.return_value.scalar.return_value = 0
                    mock_session_maker.return_value = mock_session

                    exit_code = verify_script.run_neon_verification()
                    assert exit_code == 1, f"Expected exit code 1 on row count mismatch, got {exit_code}"
    finally:
        settings.DATABASE_URL = original_url


def test_powershell_scripts_use_psscriptroot_and_safe_resolution():
    """Verify that root-level scripts use $PSScriptRoot and handle directory independence."""
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    scripts_to_check = [
        os.path.join(project_root, "verify-neon.ps1"),
        os.path.join(project_root, "setup-findit.ps1"),
        os.path.join(project_root, "start-findit.ps1"),
    ]

    for s_path in scripts_to_check:
        assert os.path.isfile(s_path), f"Script not found at: {s_path}"
        with open(s_path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "$PSScriptRoot" in content, f"Script {os.path.basename(s_path)} must use $PSScriptRoot for directory resolution"


def test_verify_neon_ps1_security_guarantees():
    """Verify that verify-neon.ps1 includes ZeroFreeBSTR, Dispose, and environment variable removal."""
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    script_path = os.path.join(project_root, "verify-neon.ps1")

    with open(script_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "ZeroFreeBSTR" in content, "verify-neon.ps1 must safely zero unmanaged memory with ZeroFreeBSTR"
    assert "Dispose" in content, "verify-neon.ps1 must dispose the SecureString object"
    assert "Remove-Item Env:\\DATABASE_URL" in content, "verify-neon.ps1 must remove the temporary DATABASE_URL env var"
    assert "finally" in content, "verify-neon.ps1 must perform credential cleanup inside a finally block"


def test_user_response_attribute_regression_and_fix():
    """Regression test: UserResponse exposes 'fullName', not 'full_name'.

    Reproduces the exact AttributeError that caused verify_neon_connection.py
    to fail Step 5, and validates that accessing 'fullName' succeeds.
    """
    user_resp = UserResponse(
        id="usr_demo_01",
        email="alex.morgan@campus.edu",
        fullName="Alex Morgan",
        campus="Central Campus",
        role="student",
        createdAt="2026-01-01T00:00:00Z",
    )
    token_resp = TokenResponse(
        access_token="fake.jwt.token",
        token_type="bearer",
        user=user_resp,
    )
    authenticated_user = token_resp.user

    # 1. Reproduce original AttributeError
    with pytest.raises(AttributeError) as exc_info:
        _ = authenticated_user.full_name
    assert "object has no attribute 'full_name'" in str(exc_info.value)

    # 2. Verify corrected attribute access
    assert authenticated_user.fullName == "Alex Morgan"
    assert authenticated_user.id == "usr_demo_01"
    assert authenticated_user.role == "student"


def test_verification_script_auth_step_success_read_only(capsys):
    """Verify that verify_neon_connection Step 5 authentication completes successfully
    without AttributeError and performs strictly read-only operations with rollback."""
    original_url = settings.DATABASE_URL
    try:
        settings.DATABASE_URL = "postgresql://test_user:test_pass@ep-sample-123.us-east-2.aws.neon.tech/findit_db"
        with patch("scripts.verify_neon_connection.session_mod.check_db_connection", return_value=(True, "connected")):
            with patch("scripts.verify_neon_connection.session_mod.engine.connect") as mock_conn_ctx:
                mock_conn = MagicMock()
                mock_conn.execute.return_value.scalar.return_value = "PostgreSQL 16.2 on x86_64"
                mock_conn_ctx.return_value.__enter__.return_value = mock_conn

                with patch("scripts.verify_neon_connection.inspect") as mock_inspect:
                    mock_inspector = MagicMock()
                    all_tables = list(verify_script.EXPECTED_TABLE_COUNTS.keys()) + ["alembic_version"]
                    mock_inspector.get_table_names.return_value = all_tables
                    mock_inspect.return_value = mock_inspector

                    with patch("scripts.verify_neon_connection.session_mod.SessionLocal") as mock_session_maker:
                        mock_session = MagicMock()
                        mock_session_maker.return_value = mock_session

                        # Configure query return values for Step 4
                        def mock_execute(statement, *args, **kwargs):
                            query_str = str(statement)
                            result = MagicMock()
                            if "alembic_version" in query_str:
                                result.scalar.return_value = verify_script.EXPECTED_ALEMBIC_VERSION
                            else:
                                for tbl, count in verify_script.EXPECTED_TABLE_COUNTS.items():
                                    if f"FROM {tbl}" in query_str:
                                        result.scalar.return_value = count
                                        return result
                                result.scalar.return_value = 0
                            return result

                        mock_session.execute.side_effect = mock_execute

                        # Configure Step 5 AuthService mock
                        mock_user_resp = UserResponse(
                            id="usr_demo_01",
                            email="alex.morgan@campus.edu",
                            fullName="Alex Morgan",
                            campus="Central Campus",
                            role="student",
                            createdAt="2026-01-01T00:00:00Z",
                        )
                        mock_token_resp = TokenResponse(
                            access_token="sample.jwt.access_token_for_verification_test",
                            token_type="bearer",
                            user=mock_user_resp,
                        )

                        with patch("scripts.verify_neon_connection.AuthService.authenticate_user", return_value=mock_token_resp):
                            # Configure Step 6 query results (Item and Claim)
                            mock_item = MagicMock()
                            mock_item.type = "lost"
                            mock_item.title = "Sample Backpack"
                            mock_item.campus = "Central Campus"

                            mock_claim = MagicMock()
                            mock_claim.id = "clm_sample_01"
                            mock_claim.status = "submitted"

                            mock_session.query.return_value.limit.return_value.all.return_value = [mock_item]
                            mock_session.query.return_value.all.return_value = [mock_claim]

                            exit_code = verify_script.run_neon_verification()

                            captured = capsys.readouterr().out
                            assert exit_code == 0, f"Expected 0, got {exit_code}. Output: {captured}"
                            assert "Authenticated User  : Alex Morgan (ID: usr_demo_01)" in captured
                            assert "User Role           : student" in captured
                            assert "JWT Generation      : Token generated successfully" in captured
                            assert "ALL VERIFICATION CHECKS PASSED" in captured

                            # Ensure zero mutation calls were executed on database session
                            mock_session.commit.assert_not_called()
                            mock_session.add.assert_not_called()
                            mock_session.delete.assert_not_called()
                            # Ensure clean rollback occurred
                            assert mock_session.rollback.called
                            assert mock_session.close.called
    finally:
        settings.DATABASE_URL = original_url


def test_verification_script_auth_failure_handling(capsys):
    """Verify that if authentication fails, verify_neon_connection handles it cleanly without crash."""
    original_url = settings.DATABASE_URL
    try:
        settings.DATABASE_URL = "postgresql://test_user:test_pass@ep-sample-123.us-east-2.aws.neon.tech/findit_db"
        with patch("scripts.verify_neon_connection.session_mod.check_db_connection", return_value=(True, "connected")):
            with patch("scripts.verify_neon_connection.session_mod.engine.connect") as mock_conn_ctx:
                mock_conn = MagicMock()
                mock_conn.execute.return_value.scalar.return_value = "PostgreSQL 16.2 on x86_64"
                mock_conn_ctx.return_value.__enter__.return_value = mock_conn

                with patch("scripts.verify_neon_connection.inspect") as mock_inspect:
                    mock_inspector = MagicMock()
                    all_tables = list(verify_script.EXPECTED_TABLE_COUNTS.keys()) + ["alembic_version"]
                    mock_inspector.get_table_names.return_value = all_tables
                    mock_inspect.return_value = mock_inspector

                    with patch("scripts.verify_neon_connection.session_mod.SessionLocal") as mock_session_maker:
                        mock_session = MagicMock()
                        mock_session_maker.return_value = mock_session

                        def mock_execute(statement, *args, **kwargs):
                            query_str = str(statement)
                            result = MagicMock()
                            if "alembic_version" in query_str:
                                result.scalar.return_value = verify_script.EXPECTED_ALEMBIC_VERSION
                            else:
                                for tbl, count in verify_script.EXPECTED_TABLE_COUNTS.items():
                                    if f"FROM {tbl}" in query_str:
                                        result.scalar.return_value = count
                                        return result
                                result.scalar.return_value = 0
                            return result

                        mock_session.execute.side_effect = mock_execute

                        # Simulate auth exception
                        with patch("scripts.verify_neon_connection.AuthService.authenticate_user", side_effect=Exception("Simulated auth error")):
                            exit_code = verify_script.run_neon_verification()

                            captured = capsys.readouterr().out
                            assert exit_code == 1, f"Expected 1 on auth failure, got {exit_code}"
                            assert "Authentication check failed for alex.morgan@campus.edu: Exception" in captured
                            mock_session.commit.assert_not_called()
    finally:
        settings.DATABASE_URL = original_url
