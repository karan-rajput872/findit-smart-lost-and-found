"""Automated test suite for Authentication, JWT Security, and User Management."""

from datetime import timedelta
import pytest
from fastapi.testclient import TestClient

from app.services.user_repository import get_user_repository
from app.core.security import create_access_token


@pytest.fixture(autouse=True)
def reset_user_repo() -> None:
    """Reset user repository to default demo user state before each test."""
    repo = get_user_repository()
    repo.seed_defaults()


def test_register_success(client: TestClient) -> None:
    """1. Verify successful account registration."""
    payload = {
        "email": "sarah.connor@campus.edu",
        "fullName": "Sarah Connor",
        "password": "StrongPassword2026!",
        "confirmPassword": "StrongPassword2026!",
        "campus": "North Engineering Campus",
        "role": "student",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["email"] == "sarah.connor@campus.edu"
    assert data["fullName"] == "Sarah Connor"
    assert data["campus"] == "North Engineering Campus"
    assert data["role"] == "student"
    assert data["id"].startswith("usr_")
    # Verify password and password hash are NEVER exposed
    assert "password" not in data
    assert "hashed_password" not in data
    assert "hashedPassword" not in data


def test_register_invalid_email(client: TestClient) -> None:
    """2. Verify rejection of malformed email addresses."""
    payload = {
        "email": "not-a-valid-email",
        "fullName": "Bad Email User",
        "password": "Password123!",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_register_weak_password(client: TestClient) -> None:
    """3. Verify rejection of weak passwords (too short, missing numbers/letters)."""
    # Too short
    resp_short = client.post("/api/v1/auth/register", json={
        "email": "user1@campus.edu",
        "fullName": "User One",
        "password": "abc",
    })
    assert resp_short.status_code == 422

    # No digits
    resp_no_digits = client.post("/api/v1/auth/register", json={
        "email": "user2@campus.edu",
        "fullName": "User Two",
        "password": "passwordonly",
    })
    assert resp_no_digits.status_code == 422


def test_register_password_mismatch(client: TestClient) -> None:
    """Verify rejection when confirmPassword does not match password."""
    payload = {
        "email": "mismatch@campus.edu",
        "fullName": "Mismatch User",
        "password": "Password123!",
        "confirmPassword": "DifferentPassword456!",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_register_duplicate_email(client: TestClient) -> None:
    """4. Verify rejection of already registered email addresses."""
    payload = {
        "email": "alex.morgan@campus.edu",  # Already seeded in repo
        "fullName": "Alex Imposter",
        "password": "Password123!",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


def test_login_success(client: TestClient) -> None:
    """5. Verify successful authentication with valid credentials."""
    payload = {
        "email": "alex.morgan@campus.edu",
        "password": "CampusPass123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "alex.morgan@campus.edu"
    assert data["user"]["fullName"] == "Alex Morgan"
    # Never expose password hashes
    assert "hashed_password" not in data["user"]


def test_login_incorrect_password(client: TestClient) -> None:
    """6. Verify rejection of invalid credentials without leaking email existence."""
    payload = {
        "email": "alex.morgan@campus.edu",
        "password": "WrongPassword999!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "invalid email or password" in response.json()["detail"].lower()


def test_login_nonexistent_email(client: TestClient) -> None:
    """Verify rejection of unknown email with identical message."""
    payload = {
        "email": "nonexistent.user@campus.edu",
        "password": "Password123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "invalid email or password" in response.json()["detail"].lower()


def test_jwt_generation_and_validation(client: TestClient) -> None:
    """7 & 8. Verify JWT creation, signature decoding, and identity access."""
    # Log in to get token
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "alex.morgan@campus.edu",
        "password": "CampusPass123!",
    })
    token = login_resp.json()["access_token"]

    # Access protected /me endpoint with valid Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200

    user_data = me_resp.json()
    assert user_data["id"] == "usr_demo_01"
    assert user_data["email"] == "alex.morgan@campus.edu"
    assert user_data["fullName"] == "Alex Morgan"


def test_expired_token_rejection(client: TestClient) -> None:
    """9. Verify rejection of expired JWT access tokens."""
    # Generate token that expired 1 hour ago
    expired_token = create_access_token(
        subject="usr_demo_01",
        expires_delta=timedelta(minutes=-60),
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_missing_token_rejection(client: TestClient) -> None:
    """10. Verify 401 response when Authorization header is absent."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "credentials were not provided" in response.json()["detail"].lower()


def test_malformed_token_rejection(client: TestClient) -> None:
    """12. Verify 401 response when Authorization header has an invalid token."""
    headers = {"Authorization": "Bearer invalid.fake.token"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


def test_user_isolation(client: TestClient) -> None:
    """13. Verify user isolation: /me always returns the token holder's profile."""
    # Register user B
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": "user.b@campus.edu",
        "fullName": "User Bravo",
        "password": "Password123!",
    })
    assert reg_resp.status_code == 201

    # Login as user B
    login_b = client.post("/api/v1/auth/login", json={
        "email": "user.b@campus.edu",
        "password": "Password123!",
    })
    token_b = login_b.json()["access_token"]

    # /me must return user B, completely isolated from Alex Morgan
    resp_b = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_b}"})
    assert resp_b.status_code == 200
    assert resp_b.json()["email"] == "user.b@campus.edu"
    assert resp_b.json()["fullName"] == "User Bravo"
    assert resp_b.json()["id"] != "usr_demo_01"


def test_logout_endpoint(client: TestClient) -> None:
    """Verify logout endpoint returns confirmation."""
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["status"] == "logged_out"
