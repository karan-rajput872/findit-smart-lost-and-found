"""Automated test suite for Authentication, JWT Security, and User Management."""

from datetime import timedelta
import pytest
from fastapi.testclient import TestClient

from app.services.user_repository import get_user_repository
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
    verify_and_update_password,
)
from app.db.session import SessionLocal
from app.models.user import User


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


def test_login_with_username_prefix(client: TestClient) -> None:
    """Verify login works using username prefix before @."""
    payload = {
        "email": "alex.morgan",
        "password": "CampusPass123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "alex.morgan@campus.edu"


def test_login_with_full_name(client: TestClient) -> None:
    """Verify login works using user's full name."""
    payload = {
        "email": "Alex Morgan",
        "password": "CampusPass123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "alex.morgan@campus.edu"


def test_login_case_insensitivity(client: TestClient) -> None:
    """Verify email case insensitivity during login."""
    payload = {
        "email": "ALEX.MORGAN@CAMPUS.EDU",
        "password": "CampusPass123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "alex.morgan@campus.edu"


def test_login_with_username_alias_field(client: TestClient) -> None:
    """Verify login accepting 'username' or 'identifier' JSON key."""
    payload = {
        "username": "alex.morgan@campus.edu",
        "password": "CampusPass123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "alex.morgan@campus.edu"


def test_registration_immediate_login_cycle(client: TestClient) -> None:
    """Verify user can register and immediately log in with identical credentials."""
    reg_email = "new.student@campus.edu"
    reg_pass = "SecurePass123!"

    reg_resp = client.post("/api/v1/auth/register", json={
        "email": reg_email,
        "fullName": "New Student",
        "password": reg_pass,
        "campus": "Central Campus",
        "role": "student",
    })
    assert reg_resp.status_code == 201

    login_resp = client.post("/api/v1/auth/login", json={
        "email": reg_email,
        "password": reg_pass,
    })
    assert login_resp.status_code == 200
    assert login_resp.json()["user"]["email"] == reg_email
    assert "access_token" in login_resp.json()


def test_password_hashing_utilities() -> None:
    """Verify password hashing, verification, mismatch, and empty checks."""
    plain = "SuperSecretPassword123!"
    pw_hash = get_password_hash(plain)

    # Must be non-empty and not plaintext
    assert pw_hash != plain
    assert len(pw_hash) > 20

    # Verification
    assert verify_password(plain, pw_hash) is True
    assert verify_password("WrongPassword!", pw_hash) is False
    assert verify_password("", pw_hash) is False
    assert verify_password(plain, "") is False

    # verify_and_update_password
    valid, updated_hash = verify_and_update_password(plain, pw_hash)
    assert valid is True


def test_protected_endpoints_require_auth(client: TestClient) -> None:
    """Verify protected endpoints reject unauthenticated requests and accept valid JWT."""
    protected_urls = [
        "/api/v1/auth/me",
        "/api/v1/items/my-listings",
        "/api/v1/claims/my-claims",
        "/api/v1/claims/received",
        "/api/v1/notifications",
    ]

    # Without token: all must return 401
    for url in protected_urls:
        resp = client.get(url)
        assert resp.status_code == 401, f"Expected 401 for unauthenticated {url}, got {resp.status_code}"

    # Log in and verify all accept the issued token
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "alex.morgan@campus.edu",
        "password": "CampusPass123!",
    })
    token = login_resp.json()["access_token"]
    auth_header = {"Authorization": f"Bearer {token}"}

    for url in protected_urls:
        resp = client.get(url, headers=auth_header)
        assert resp.status_code == 200, f"Expected 200 for authenticated {url}, got {resp.status_code}"


def test_user_persistence_in_database(client: TestClient) -> None:
    """Verify newly registered user is persisted in DB with hashed password and isolated data."""
    unique_email = "db.persist.check@campus.edu"
    raw_password = "PersistencePass123!"

    reg_resp = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "fullName": "Persistence Test User",
        "password": raw_password,
        "campus": "West Science Campus",
        "role": "student",
    })
    assert reg_resp.status_code == 201
    user_id = reg_resp.json()["id"]

    # Verify directly in database session
    db = SessionLocal()
    try:
        user_record = db.query(User).filter(User.id == user_id).first()
        assert user_record is not None
        assert user_record.email == unique_email
        assert user_record.full_name == "Persistence Test User"
        assert user_record.hashed_password != raw_password
        assert verify_password(raw_password, user_record.hashed_password) is True
    finally:
        db.close()


def test_session_lifecycle_flow(client: TestClient) -> None:
    """Verify full Register -> Login -> Refresh /me -> Logout cycle."""
    email = "lifecycle.user@campus.edu"
    password = "LifecyclePassword123!"

    # 1. Register
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "fullName": "Lifecycle User",
        "password": password,
        "campus": "Central Campus",
        "role": "student",
    })
    assert reg.status_code == 201

    # 2. Login
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]

    # 3. Fetch profile (simulating page reload with Bearer token)
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email

    # 4. Logout
    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 200


