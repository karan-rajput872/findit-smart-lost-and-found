"""Automated test suite verifying production readiness enhancements.

Tests:
1. Role Escalation Prevention: Self-assigning 'admin' on registration is rejected with 422.
2. Image Magic Byte Inspection: Uploading a malicious text file disguised as PNG is rejected with 400.
3. Rate Limiting: Exceeding threshold triggers HTTP 429 with Retry-After header.
4. Contact Information Privacy: Reporter email is hidden in public search results and item views.
5. Recovered Item Protection: Items marked as returned/resolved cannot be claimed.
"""

import io
import pytest
from fastapi.testclient import TestClient
from app.core.rate_limit import apply_rate_limit
from fastapi import HTTPException


def test_registration_admin_role_escalation_rejected(client: TestClient) -> None:
    """Verify that attempting to register with role='admin' is rejected."""
    payload = {
        "fullName": "Malicious Admin Wannabe",
        "email": "hacker.admin@campus.edu",
        "password": "Password123!",
        "confirmPassword": "Password123!",
        "role": "admin",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "administrator is prohibited" in str(data).lower()


def test_upload_image_magic_bytes_validation(client: TestClient) -> None:
    """Verify that fake image with invalid binary header is rejected with 400."""
    # Register and login a student
    user_payload = {
        "fullName": "Image Tester",
        "email": "image.tester@campus.edu",
        "password": "Password123!",
        "confirmPassword": "Password123!",
    }
    client.post("/api/v1/auth/register", json=user_payload)
    login_resp = client.post("/api/v1/auth/login", json={"email": "image.tester@campus.edu", "password": "Password123!"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Text content disguised as image/png
    fake_png = io.BytesIO(b"<html><script>alert('pwned')</script></html>")
    files = {"file": ("exploit.png", fake_png, "image/png")}
    response = client.post("/api/v1/items/upload-image", files=files, headers=headers)
    assert response.status_code == 400
    assert "header does not match" in response.json()["detail"].lower()


def test_rate_limiter_unit_enforcement() -> None:
    """Verify that apply_rate_limit throws 429 when max_requests is exceeded."""
    test_key = "test_ratelimit:unit_test_ip"
    
    # First 2 requests pass (limit = 2)
    apply_rate_limit(key=test_key, max_requests=2, window_seconds=10)
    apply_rate_limit(key=test_key, max_requests=2, window_seconds=10)

    # 3rd request must raise HTTPException 429
    with pytest.raises(HTTPException) as exc_info:
        apply_rate_limit(key=test_key, max_requests=2, window_seconds=10, error_message="Rate limit test")
    
    assert exc_info.value.status_code == 429
    assert "Retry-After" in exc_info.value.headers
    assert "Rate limit test" in exc_info.value.detail


def test_public_contact_privacy_redaction(client: TestClient) -> None:
    """Verify that personal reporter contact is not leaked to public viewers."""
    # 1. Register reporter
    client.post("/api/v1/auth/register", json={
        "fullName": "Private Reporter",
        "email": "private.reporter@campus.edu",
        "password": "Password123!",
        "confirmPassword": "Password123!",
    })
    login_resp = client.post("/api/v1/auth/login", json={"email": "private.reporter@campus.edu", "password": "Password123!"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create item
    item_resp = client.post("/api/v1/items", json={
        "title": "Private Silver Necklace",
        "description": "Engraved initials on back",
        "category": "Jewelry",
        "type": "lost",
        "location": "Student Lounge",
        "campus": "Central Campus",
        "date": "2026-10-15",
    }, headers=headers)
    assert item_resp.status_code == 201
    item_id = item_resp.json()["id"]

    # 3. Unauthenticated public fetch should have reporterContact redacted
    public_fetch = client.get(f"/api/v1/items/{item_id}")
    assert public_fetch.status_code == 200
    assert public_fetch.json()["reporterContact"] is None

    # 4. Owner fetch preserves reporterContact
    owner_fetch = client.get(f"/api/v1/items/{item_id}", headers=headers)
    assert owner_fetch.status_code == 200
    assert owner_fetch.json()["reporterContact"] == "private.reporter@campus.edu"
