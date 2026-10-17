"""Pytest test configuration and fixtures with ISOLATED test database."""

import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# CRITICAL: Isolate tests to a dedicated test database so real development records in findit.db are NEVER touched
os.environ["ENVIRONMENT"] = "testing"
test_db_path = os.path.join(backend_dir, "data", "test_findit.db").replace("\\", "/")
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.init_db import init_db
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def initialize_test_database():
    """Ensure isolated test database schema and initial demo state are ready."""
    init_db()
    yield
    # Cleanup test database connection
    try:
        engine.dispose()
    except Exception:
        pass


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Provide a TestClient instance for testing endpoints."""
    return TestClient(app)
