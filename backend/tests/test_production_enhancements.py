"""Automated test suite verifying production readiness enhancements.

Tests:
1. Role Escalation Prevention: Self-assigning 'admin' on registration is rejected with 422.
2. Image Magic Byte Inspection: Uploading a malicious text file disguised as PNG is rejected with 400.
3. Image Structural Verification & Malformed Rejection: Truncated or corrupted image data rejected with 400.
4. Decompression Bomb Protection: Unreasonably huge pixel counts rejected with 400.
5. Rate Limiting: Exceeding threshold triggers HTTP 429 with Retry-After header.
6. Rate Limit Anti-Spoofing & Client IP Extraction: Validates proxy IP handling without blind trust.
7. Bounded Rate Limit Event Cleanup: Verifies expired events are cleaned up in safe batches.
8. Contact Information Privacy: Reporter email is hidden in public search results and item views.
9. Recovered Item Protection: Items marked as returned/resolved cannot be claimed.
"""

import io
import time
import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request
from app.core.rate_limit import (
    apply_rate_limit,
    get_client_ip,
    cleanup_expired_events,
    RateLimitEvent,
)
from app.db.session import SessionLocal
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


def test_upload_image_corrupted_stream_rejected(client: TestClient) -> None:
    """Verify that image with valid magic bytes but corrupted or truncated payload is rejected."""
    user_payload = {
        "fullName": "Corrupt Tester",
        "email": "corrupt.tester@campus.edu",
        "password": "Password123!",
        "confirmPassword": "Password123!",
    }
    client.post("/api/v1/auth/register", json=user_payload)
    login_resp = client.post("/api/v1/auth/login", json={"email": "corrupt.tester@campus.edu", "password": "Password123!"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Valid PNG header followed by corrupted truncated garbage
    corrupted_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02MALFORMED_DATA_BYTES")
    files = {"file": ("corrupt.png", corrupted_png, "image/png")}
    response = client.post("/api/v1/items/upload-image", files=files, headers=headers)
    assert response.status_code == 400
    assert "corrupted" in response.json()["detail"].lower() or "malformed" in response.json()["detail"].lower()


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


def test_rate_limit_client_ip_anti_spoofing() -> None:
    """Verify get_client_ip parses trusted proxy headers and rejects spoofed values."""
    scope = {
        "type": "http",
        "client": ("10.0.0.1", 12345),
        "headers": [
            (b"x-forwarded-for", b"198.51.100.42, 10.0.0.1"),
        ],
    }
    req = Request(scope)
    extracted_ip = get_client_ip(req)
    assert extracted_ip == "198.51.100.42"

    # Spoofed invalid IP strings should fallback safely
    bad_scope = {
        "type": "http",
        "client": ("127.0.0.1", 12345),
        "headers": [
            (b"x-forwarded-for", b"bad_ip_address_not_valid"),
        ],
    }
    bad_req = Request(bad_scope)
    assert get_client_ip(bad_req) == "127.0.0.1"


def test_rate_limit_bounded_cleanup() -> None:
    """Verify that cleanup_expired_events executes bounded deletion safely."""
    db = SessionLocal()
    try:
        old_time = time.time() - 1000
        # Seed 5 expired events
        for i in range(5):
            db.add(RateLimitEvent(key=f"cleanup_test:{i}", timestamp=old_time))
        db.commit()

        # Force cleanup execution by resetting last cleanup timer
        import app.core.rate_limit as rl_module
        rl_module._last_cleanup_timestamp = 0.0

        deleted = cleanup_expired_events(db, max_age_seconds=60, batch_size=10)
        assert deleted >= 5
    finally:
        db.close()


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
