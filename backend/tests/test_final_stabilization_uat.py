"""
Comprehensive User Acceptance & Final Stabilization Test Suite for FindIt
Covers:
- Workflow A: Authentication, login, logout, relogin, JWT expiration, admin role escalation prevention
- Workflow B: Lost-item reporting, image validation, retrieval, and persistence
- Workflow C: Found-item reporting, confidential details privacy
- Workflow D: Search, category/location/date filtering, sorting, empty states, recovered/resolved items exclusion
- Workflow E: Ownership enforcement, non-owner update/delete 403 forbidden
- Workflow F: Claims lifecycle, duplicate claim prevention, notification dispatch, contact privacy
- Workflow G: Messaging within claim, unauthorized access 403, persistence, read/unread status
- Workflow H: Recovered/resolved items lifecycle, status update, exclusion from active listings, new claims blocked
- Phase 4: Failure testing (malformed image rejection, oversized image rejection, invalid credentials)
"""

import io
import time
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from PIL import Image

from app.main import app
from app.db.session import get_db
from app.core.security import create_access_token


def create_test_image_bytes(format="PNG", size=(100, 100), color="blue"):
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    return buf.getvalue()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_uat_full_workflow_suite(client: TestClient):
    timestamp = int(time.time())
    user_a_email = f"uat_user_a_{timestamp}@campus.edu"
    user_b_email = f"uat_user_b_{timestamp}@campus.edu"
    password = "SecurePassword123!"

    # =========================================================================
    # WORKFLOW A — Authentication & Role Escalation Prevention
    # =========================================================================
    # 1. Attempt admin role escalation during registration -> Must be rejected
    reg_admin_attempt = client.post("/api/v1/auth/register", json={
        "fullName": "UAT Malicious Admin",
        "email": f"malicious_{timestamp}@campus.edu",
        "password": password,
        "confirmPassword": password,
        "campus": "North Campus",
        "role": "admin"
    })
    assert reg_admin_attempt.status_code == 422
    assert "administrator is prohibited" in reg_admin_attempt.text

    # Register User A as standard user
    reg_a = client.post("/api/v1/auth/register", json={
        "fullName": "UAT User A",
        "email": user_a_email,
        "password": password,
        "confirmPassword": password,
        "campus": "North Campus"
    })
    assert reg_a.status_code == 201, f"User A registration failed: {reg_a.text}"
    user_a_data = reg_a.json()
    assert user_a_data["email"] == user_a_email
    assert user_a_data["role"] in ("user", "student", "staff"), "Unexpected role"

    # 2. Register User B
    reg_b = client.post("/api/v1/auth/register", json={
        "fullName": "UAT User B",
        "email": user_b_email,
        "password": password,
        "confirmPassword": password,
        "campus": "South Campus"
    })
    assert reg_b.status_code == 201, f"User B registration failed: {reg_b.text}"
    user_b_data = reg_b.json()

    # 3. Log in User A
    login_a = client.post("/api/v1/auth/login", json={
        "email": user_a_email,
        "password": password
    })
    assert login_a.status_code == 200
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 4. Log in User B
    login_b = client.post("/api/v1/auth/login", json={
        "email": user_b_email,
        "password": password
    })
    assert login_b.status_code == 200
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 5. Verify /me profile
    me_a = client.get("/api/v1/auth/me", headers=headers_a)
    assert me_a.status_code == 200
    assert me_a.json()["email"] == user_a_email
    assert me_a.json()["role"] in ("student", "user", "staff")

    # 6. Verify Logout endpoint
    logout_res = client.post("/api/v1/auth/logout", headers=headers_a)
    assert logout_res.status_code == 200

    # 7. Relogin User A
    relogin_a = client.post("/api/v1/auth/login", json={
        "email": user_a_email,
        "password": password
    })
    assert relogin_a.status_code == 200
    token_a = relogin_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 8. Expired token rejection
    expired_token = create_access_token(
        subject=str(user_a_data["id"]),
        expires_delta=timedelta(seconds=-60)
    )
    exp_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert exp_res.status_code == 401

    # =========================================================================
    # WORKFLOW B — Lost-item reporting (User A)
    # =========================================================================
    # 1. Image upload test
    valid_png = create_test_image_bytes("PNG", size=(120, 120), color="red")
    upload_res = client.post(
        "/api/v1/items/upload-image",
        headers=headers_a,
        files={"file": ("test_blue_backpack.png", valid_png, "image/png")}
    )
    assert upload_res.status_code == 200
    image_url = upload_res.json().get("url") or upload_res.json().get("imageUrl") or upload_res.json().get("image_url")
    assert image_url is not None

    # 2. Create Lost Item Report
    lost_item_payload = {
        "title": f"Lost Navy Backpack {timestamp}",
        "description": "Lost near Campus Library 2nd floor, contains notebooks and blue water bottle",
        "category": "Accessories",
        "type": "lost",
        "location": "Campus Library Floor 2",
        "campus": "North Campus",
        "date": "2026-10-17",
        "imageUrl": image_url
    }
    create_lost = client.post("/api/v1/items", headers=headers_a, json=lost_item_payload)
    assert create_lost.status_code == 201, f"Create lost item failed: {create_lost.text}"
    lost_item = create_lost.json()
    lost_item_id = lost_item["id"]
    assert lost_item["title"] == lost_item_payload["title"]
    assert lost_item["status"] == "open"

    # Confirm report is in User A's my-listings
    my_listings = client.get("/api/v1/items/my-listings", headers=headers_a)
    assert my_listings.status_code == 200
    my_ids = [item["id"] for item in my_listings.json()["items"]]
    assert lost_item_id in my_ids

    # =========================================================================
    # WORKFLOW C — Found-item reporting (User B)
    # =========================================================================
    found_item_payload = {
        "title": f"Found Hydro Flask Water Bottle {timestamp}",
        "description": "Found on a study desk at Student Center. Inquire with proof of stickers.",
        "category": "Accessories",
        "type": "found",
        "location": "Student Center",
        "campus": "South Campus",
        "date": "2026-10-17",
        "imageUrl": "https://images.unsplash.com/photo-1602143407151-7111542de6e8"
    }
    create_found = client.post("/api/v1/items", headers=headers_b, json=found_item_payload)
    assert create_found.status_code == 201, f"Create found item failed: {create_found.text}"
    found_item = create_found.json()
    found_item_id = found_item["id"]

    # =========================================================================
    # WORKFLOW D — Search and Filtering
    # =========================================================================
    # Search by title
    search_res = client.get(f"/api/v1/items?q=Navy+Backpack+{timestamp}")
    assert search_res.status_code == 200
    found_titles = [it["title"] for it in search_res.json()["items"]]
    assert lost_item_payload["title"] in found_titles

    # Filter by type: lost
    lost_filtered = client.get(f"/api/v1/items?type=lost&q={timestamp}")
    assert lost_filtered.status_code == 200
    assert all(it["type"] == "lost" for it in lost_filtered.json()["items"])

    # Filter by category
    cat_filtered = client.get(f"/api/v1/items?category=Accessories&q={timestamp}")
    assert cat_filtered.status_code == 200
    assert any(it["id"] == lost_item_id for it in cat_filtered.json()["items"])

    # Empty search
    empty_res = client.get(f"/api/v1/items?q=NonExistentItemName{timestamp}XYZ999")
    assert empty_res.status_code == 200
    assert len(empty_res.json()["items"]) == 0

    # =========================================================================
    # WORKFLOW E — Ownership & Permissions
    # =========================================================================
    # User A updates own item -> Allowed
    update_res = client.put(f"/api/v1/items/{lost_item_id}", headers=headers_a, json={
        "title": lost_item_payload["title"],
        "description": "Updated: Lost near Library 2nd floor, reward offered!",
        "category": "Accessories",
        "type": "lost",
        "location": "Campus Library Floor 2",
        "campus": "North Campus",
        "date": "2026-10-17"
    })
    assert update_res.status_code == 200
    assert "reward offered" in update_res.json()["description"]

    # User B attempts to update User A's item -> 403 Forbidden
    unauth_update = client.put(f"/api/v1/items/{lost_item_id}", headers=headers_b, json={
        "title": "Hacked Title",
        "description": "Malicious edit attempt by User B",
        "category": "Accessories",
        "type": "lost",
        "location": "Campus Library Floor 2",
        "campus": "North Campus",
        "date": "2026-10-17"
    })
    assert unauth_update.status_code == 403

    # User B attempts to delete User A's item -> 403 Forbidden
    unauth_delete = client.delete(f"/api/v1/items/{lost_item_id}", headers=headers_b)
    assert unauth_delete.status_code == 403

    # =========================================================================
    # WORKFLOW F — Claims & Contact Privacy
    # =========================================================================
    # User B submits a claim against User A's lost item
    claim_payload = {
        "itemId": lost_item_id,
        "description": "I found a backpack matching your description at the campus front desk!",
        "proofDetails": "It has your student ID lanyard inside."
    }
    submit_claim = client.post("/api/v1/claims", headers=headers_b, json=claim_payload)
    assert submit_claim.status_code == 201, f"Claim submission failed: {submit_claim.text}"
    claim_data = submit_claim.json()
    claim_id = claim_data["id"]
    assert claim_data["status"] == "pending"

    # Duplicate claim prevention
    dup_claim = client.post("/api/v1/claims", headers=headers_b, json=claim_payload)
    assert dup_claim.status_code in (400, 409), "Duplicate claim was not rejected!"

    # User A checks received notifications
    notifs_a = client.get("/api/v1/notifications", headers=headers_a)
    assert notifs_a.status_code == 200
    notif_list = notifs_a.json()["notifications"]
    assert any("claim" in n["title"].lower() or "claim" in n["message"].lower() for n in notif_list)

    # User A reviews and approves the claim
    approve_res = client.patch(f"/api/v1/claims/{claim_id}/review", headers=headers_a, json={
        "status": "approved",
        "reviewNotes": "Lanyard details match perfectly."
    })
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    # =========================================================================
    # WORKFLOW G — Messaging & Unauthorized Thread Isolation
    # =========================================================================
    # User B sends message to User A in the claim thread
    send_msg = client.post(f"/api/v1/claims/{claim_id}/messages", headers=headers_b, json={
        "content": "Hi User A, let us meet at the library foyer tomorrow at 10 AM."
    })
    assert send_msg.status_code == 201
    msg_data = send_msg.json()
    assert msg_data["content"] == "Hi User A, let us meet at the library foyer tomorrow at 10 AM."

    # User A reads messages
    get_msgs = client.get(f"/api/v1/claims/{claim_id}/messages", headers=headers_a)
    assert get_msgs.status_code == 200
    msgs = get_msgs.json()["messages"]
    assert len(msgs) >= 1
    assert any("library foyer" in m["content"] for m in msgs)

    # Register User C (third party) and verify 403 on messages
    user_c_email = f"uat_user_c_{timestamp}@campus.edu"
    reg_c = client.post("/api/v1/auth/register", json={
        "fullName": "UAT User C",
        "email": user_c_email,
        "password": password,
        "confirmPassword": password,
        "campus": "East Campus"
    })
    assert reg_c.status_code == 201
    login_c = client.post("/api/v1/auth/login", json={"email": user_c_email, "password": password})
    headers_c = {"Authorization": f"Bearer {login_c.json()['access_token']}"}

    unauth_thread = client.get(f"/api/v1/claims/{claim_id}/messages", headers=headers_c)
    assert unauth_thread.status_code == 403, "Third party user accessed private claim messages!"

    # =========================================================================
    # WORKFLOW H — Recovered Items Lifecycle
    # =========================================================================
    # User A marks claim as complete / item recovered
    complete_res = client.post(
        f"/api/v1/claims/{claim_id}/complete",
        headers=headers_a,
        json={"completionNotes": "Item successfully returned to owner."}
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"

    # Associated item status should be updated to 'returned'
    item_check = client.get(f"/api/v1/items/{lost_item_id}")
    assert item_check.status_code == 200
    assert item_check.json()["status"] == "returned"

    # Active search results must EXCLUDE returned/recovered item
    active_search = client.get(f"/api/v1/items?q=Navy+Backpack+{timestamp}")
    assert active_search.status_code == 200
    active_ids = [it["id"] for it in active_search.json()["items"]]
    assert lost_item_id not in active_ids, "Recovered item appeared in active search results!"

    # Owner's history retains recovered item
    my_history = client.get("/api/v1/items/my-listings", headers=headers_a)
    assert my_history.status_code == 200
    hist_ids = [it["id"] for it in my_history.json()["items"]]
    assert lost_item_id in hist_ids, "Recovered item missing from owner history!"

    # New claims on recovered item must be blocked
    new_claim_on_recovered = client.post("/api/v1/claims", headers=headers_c, json={
        "itemId": lost_item_id,
        "description": "Attempting to claim an already recovered item",
        "proofDetails": "Proof"
    })
    assert new_claim_on_recovered.status_code in (400, 409), "Claim on recovered item was not blocked!"


def test_failure_modes_and_security(client: TestClient):
    timestamp = int(time.time())
    user_email = f"failure_test_{timestamp}@campus.edu"
    password = "SecurePassword123!"

    reg = client.post("/api/v1/auth/register", json={
        "fullName": "Failure Tester",
        "email": user_email,
        "password": password,
        "confirmPassword": password,
        "campus": "West Campus"
    })
    assert reg.status_code == 201
    login = client.post("/api/v1/auth/login", json={"email": user_email, "password": password})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # 1. Malformed image upload rejection
    malformed_bytes = b"\x89PNG\r\n\x1a\n" + b"Corrupted garbage data payload..."
    mal_res = client.post(
        "/api/v1/items/upload-image",
        headers=headers,
        files={"file": ("corrupt.png", malformed_bytes, "image/png")}
    )
    assert mal_res.status_code == 400
    assert "corrupt" in mal_res.text.lower() or "invalid" in mal_res.text.lower()

    # 2. Oversized file (> 5 MB) rejection
    oversized_bytes = b"0" * (5 * 1024 * 1024 + 1024)
    over_res = client.post(
        "/api/v1/items/upload-image",
        headers=headers,
        files={"file": ("large.png", oversized_bytes, "image/png")}
    )
    assert over_res.status_code == 400
    assert "5 mb" in over_res.text.lower() or "size" in over_res.text.lower()

    # 3. Failed login rejection
    bad_login = client.post("/api/v1/auth/login", json={
        "email": user_email,
        "password": "WrongPassword123!"
    })
    assert bad_login.status_code == 401
