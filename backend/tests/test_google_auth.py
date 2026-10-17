"""
Comprehensive unit and integration test suite for Google Identity Services authentication.
Validates token verification, audience/issuer security checks, safe account linking,
role preservation, and JWT issuance.
"""

import time
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import decode_access_token


def test_google_auth_missing_token_rejected(client: TestClient):
    """POST /api/v1/auth/google without an idToken payload should return HTTP 422."""
    res = client.post("/api/v1/auth/google", json={})
    assert res.status_code == 422


def test_google_auth_invalid_token_rejected(client: TestClient):
    """POST /api/v1/auth/google with a malformed/invalid token should return HTTP 401."""
    with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Token is invalid")):
        res = client.post("/api/v1/auth/google", json={"idToken": "malformed.invalid.token"})
        assert res.status_code == 401
        assert "Google authentication failed" in res.json()["detail"]


def test_google_auth_expired_token_rejected(client: TestClient):
    """POST /api/v1/auth/google with an expired Google token should return HTTP 401."""
    with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Token expired")):
        res = client.post("/api/v1/auth/google", json={"idToken": "expired.jwt.token"})
        assert res.status_code == 401
        assert "Token expired" in res.json()["detail"]


def test_google_auth_incorrect_issuer_rejected(client: TestClient):
    """POST /api/v1/auth/google with an untrusted issuer should return HTTP 401."""
    mock_payload = {
        "iss": "https://untrusted-issuer.example.com",
        "sub": "google_sub_untrusted_123",
        "email": "hacker@example.com",
        "email_verified": True,
        "name": "Untrusted User",
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        res = client.post("/api/v1/auth/google", json={"idToken": "valid.token.bad.issuer"})
        assert res.status_code == 401
        assert "Invalid Google token issuer" in res.json()["detail"]


def test_google_auth_unverified_email_rejected(client: TestClient):
    """POST /api/v1/auth/google with unverified email claim should return HTTP 400."""
    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": "google_sub_unverified_123",
        "email": "unverified@example.com",
        "email_verified": False,
        "name": "Unverified User",
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        res = client.post("/api/v1/auth/google", json={"idToken": "valid.token.unverified.email"})
        assert res.status_code == 400
        assert "not verified" in res.json()["detail"].lower()


def test_google_auth_incorrect_audience_rejected(client: TestClient):
    """When GOOGLE_CLIENT_ID is configured, token with mismatched aud must be rejected with HTTP 401."""
    with patch.object(settings, "GOOGLE_CLIENT_ID", "expected-client-id.apps.googleusercontent.com"):
        with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Token audience doesn't match")):
            res = client.post("/api/v1/auth/google", json={"idToken": "valid.token.wrong.audience"})
            assert res.status_code == 401
            assert "audience" in res.json()["detail"].lower()


def test_google_auth_case_a_new_user_creation(client: TestClient):
    """Case A: New Google user should be safely provisioned with lowest privilege role ('student')."""
    ts = int(time.time() * 1000)
    google_sub = f"sub_new_user_{ts}"
    google_email = f"student_{ts}@campus.edu"
    google_name = f"New Student {ts}"
    avatar_url = "https://lh3.googleusercontent.com/a/avatar123"

    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": google_sub,
        "email": google_email,
        "email_verified": True,
        "name": google_name,
        "picture": avatar_url,
    }

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        res = client.post("/api/v1/auth/google", json={"idToken": "valid.google.id.token"})
        assert res.status_code == 200
        data = res.json()

        # Token verification
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        user = data["user"]
        assert user["email"] == google_email
        assert user["fullName"] == google_name
        assert user["role"] == "student"  # Standard lowest-privilege role
        assert user["avatarUrl"] == avatar_url
        assert user["authProvider"] == "google"

        # Verify issued JWT works on protected route
        me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
        assert me_res.status_code == 200
        assert me_res.json()["id"] == user["id"]


def test_google_auth_case_b_existing_google_user_login(client: TestClient):
    """Case B: Existing Google-linked user authenticates again, preserving account and role."""
    ts = int(time.time() * 1000)
    google_sub = f"sub_returning_{ts}"
    google_email = f"returning_{ts}@campus.edu"

    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": google_sub,
        "email": google_email,
        "email_verified": True,
        "name": "Returning Google User",
    }

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        # 1st sign in (creation)
        res1 = client.post("/api/v1/auth/google", json={"idToken": "token_returning_user_1"})
        assert res1.status_code == 200
        user_id_1 = res1.json()["user"]["id"]

        # 2nd sign in (login)
        res2 = client.post("/api/v1/auth/google", json={"idToken": "token_returning_user_2"})
        assert res2.status_code == 200
        user_id_2 = res2.json()["user"]["id"]

        # User ID must be identical (no duplicate accounts)
        assert user_id_1 == user_id_2


def test_google_auth_case_c_existing_email_account_linking(client: TestClient):
    """Case C: Existing email/password user signs in with Google; accounts are safely linked."""
    ts = int(time.time() * 1000)
    email = f"existing_local_{ts}@campus.edu"
    password = "TestPassword123!"

    # 1. Register with email/password
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "fullName": "Local Account User",
        "password": password,
        "campus": "Central Campus",
        "role": "student",
    })
    assert reg_res.status_code == 201
    original_user_id = reg_res.json()["id"]

    # 2. Sign in with Google using same verified email
    google_sub = f"sub_linking_{ts}"
    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": google_sub,
        "email": email,
        "email_verified": True,
        "name": "Local Account User",
        "picture": "https://lh3.googleusercontent.com/a/linked_pic",
    }

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        google_res = client.post("/api/v1/auth/google", json={"idToken": "token_link"})
        assert google_res.status_code == 200
        data = google_res.json()
        assert data["user"]["id"] == original_user_id
        assert data["user"]["authProvider"] == "google_and_local"

    # 3. Verify original password authentication STILL works!
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    assert login_res.json()["user"]["id"] == original_user_id


def test_google_auth_case_d_duplicate_google_sub_conflict_prevented(client: TestClient):
    """Case D: Account already linked to one Google sub cannot be hijacked by another Google sub."""
    ts = int(time.time() * 1000)
    email = f"linked_user_{ts}@campus.edu"
    sub_1 = f"google_sub_legit_{ts}"
    sub_2 = f"google_sub_attacker_{ts}"

    # 1. Link account with sub_1
    mock_payload_1 = {
        "iss": "https://accounts.google.com",
        "sub": sub_1,
        "email": email,
        "email_verified": True,
        "name": "Legitimate Owner",
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload_1):
        res1 = client.post("/api/v1/auth/google", json={"idToken": "token_owner"})
        assert res1.status_code == 200

    # 2. Attempt to authenticate same email with a DIFFERENT Google sub
    mock_payload_2 = {
        "iss": "https://accounts.google.com",
        "sub": sub_2,
        "email": email,
        "email_verified": True,
        "name": "Second Identity Attempt",
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload_2):
        res2 = client.post("/api/v1/auth/google", json={"idToken": "token_attacker"})
        assert res2.status_code == 400
        assert "associated with a different Google account" in res2.json()["detail"]


def test_google_auth_existing_role_preserved(client: TestClient):
    """If an existing account with staff role links Google, role remains 'staff'."""
    # Pre-existing demo staff account 'library-help@campus.edu'
    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": "google_sub_library_staff_999",
        "email": "library-help@campus.edu",
        "email_verified": True,
        "name": "Library Desk Staff",
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        res = client.post("/api/v1/auth/google", json={"idToken": "token_staff"})
        assert res.status_code == 200
        assert res.json()["user"]["role"] == "staff"


def test_google_jwt_structure_and_claims(client: TestClient):
    """Ensure issued FindIt JWT follows exact structure, algorithms, and claims."""
    ts = int(time.time() * 1000)
    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": f"sub_jwt_test_{ts}",
        "email": f"jwt_user_{ts}@campus.edu",
        "email_verified": True,
        "name": "JWT Test User",
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        res = client.post("/api/v1/auth/google", json={"idToken": "valid_mock_jwt_token_12345"})
        assert res.status_code == 200
        token = res.json()["access_token"]
        claims = decode_access_token(token)
        assert claims is not None
        assert claims.get("email") == f"jwt_user_{ts}@campus.edu"
        assert claims.get("role") == "student"
        assert "sub" in claims
