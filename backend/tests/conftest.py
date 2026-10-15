"""Pytest test configuration and fixtures."""

import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.init_db import init_db
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def initialize_test_database():
    """Ensure database schema and initial state are ready before test execution."""
    init_db()


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Provide a TestClient instance for testing endpoints."""
    return TestClient(app)
