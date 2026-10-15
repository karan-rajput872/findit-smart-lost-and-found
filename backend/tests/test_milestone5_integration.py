"""Integration tests verifying Milestone 5 End-to-End full-stack workflows.

Covers:
- WORKFLOW A: Registration -> Login -> Profile & Dashboard Stats
- WORKFLOW B: Report Lost Item -> Verify Listing -> Details
- WORKFLOW C: Report Found Item -> Verify Listing -> Details
- WORKFLOW D: My Reports -> Update Own Report -> Ownership Restriction (403) -> Delete Own Report
- WORKFLOW E: Logout / Unauthenticated access to protected endpoints rejected (401)
"""

import pytest
from fastapi.testclient import TestClient


def test_workflow_a_register_login_dashboard_profile(client: TestClient) -> None:
    """WORKFLOW A: Register -> Login -> Profile -> Item Stats."""
    # 1. Register new student
    register_payload = {
        "fullName": "Maya Lin",
        "email": "maya.lin@campus.edu",
        "password": "Password123!",
        "confirmPassword": "Password123!",
        "campus": "East Campus",
        "role": "student",
    }
    reg_resp = client.post("/api/v1/auth/register", json=register_payload)
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()
    assert user_data["email"] == "maya.lin@campus.edu"
    assert user_data["fullName"] == "Maya Lin"
    assert "id" in user_data

    # 2. Login with newly created credentials
    login_payload = {
        "email": "maya.lin@campus.edu",
        "password": "Password123!",
    }
    login_resp = client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Retrieve user profile via /auth/me
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "maya.lin@campus.edu"

    # 4. Fetch dashboard stats with user token
    stats_resp = client.get("/api/v1/items/stats", headers=headers)
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_items"] >= 0
    # Maya has 0 submitted items so far
    assert stats["my_items_count"] == 0


def test_workflow_b_and_c_report_lost_and_found_items(client: TestClient) -> None:
    """WORKFLOW B & C: Login -> Report Lost -> Report Found -> Verify Listings & Details."""
    # 1. Register and login student Jordan
    user_payload = {
        "fullName": "Jordan Rivera",
        "email": "jordan.rivera@campus.edu",
        "password": "CampusSafe2026!",
        "confirmPassword": "CampusSafe2026!",
        "campus": "Central Campus",
    }
    client.post("/api/v1/auth/register", json=user_payload)
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "jordan.rivera@campus.edu", "password": "CampusSafe2026!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. WORKFLOW B: Report Lost Item
    lost_item_payload = {
        "type": "lost",
        "title": "Black Kindle Paperwhite in Olive Case",
        "category": "Electronics",
        "description": "Left on table 12 at Campus Coffee Shop. Has a sticker of a pine tree on the back.",
        "location": "Central Campus, Coffee Shop",
        "campus": "Central Campus",
        "date": "2026-10-14",
        "imageUrl": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c",
    }
    lost_resp = client.post("/api/v1/items", json=lost_item_payload, headers=headers)
    assert lost_resp.status_code == 201
    created_lost = lost_resp.json()
    assert created_lost["title"] == "Black Kindle Paperwhite in Olive Case"
    assert created_lost["type"] == "lost"
    assert created_lost["status"] == "open"
    lost_id = created_lost["id"]

    # 3. WORKFLOW C: Report Found Item
    found_item_payload = {
        "type": "found",
        "title": "Silver Scientific Calculator TI-84",
        "category": "Electronics",
        "description": "Found on lecture hall 101 bench after Physics 201 lecture.",
        "location": "Physics Hall 101",
        "campus": "Central Campus",
        "date": "2026-10-14",
        "imageUrl": "https://images.unsplash.com/photo-1587145820266-a5951ee6f620",
    }
    found_resp = client.post("/api/v1/items", json=found_item_payload, headers=headers)
    assert found_resp.status_code == 201
    created_found = found_resp.json()
    assert created_found["title"] == "Silver Scientific Calculator TI-84"
    assert created_found["type"] == "found"
    found_id = created_found["id"]

    # 4. Verify items appear in browse listings
    browse_resp = client.get("/api/v1/items")
    assert browse_resp.status_code == 200
    all_items = browse_resp.json()["items"]
    item_ids = [it["id"] for it in all_items]
    assert lost_id in item_ids
    assert found_id in item_ids

    # 5. Search for lost item by title keyword
    search_resp = client.get("/api/v1/items?q=Kindle")
    assert search_resp.status_code == 200
    search_items = search_resp.json()["items"]
    assert any(it["id"] == lost_id for it in search_items)

    # 6. Fetch details directly by ID
    detail_resp = client.get(f"/api/v1/items/{lost_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == lost_id
    assert detail_resp.json()["title"] == "Black Kindle Paperwhite in Olive Case"


def test_workflow_d_my_reports_and_ownership_security(client: TestClient) -> None:
    """WORKFLOW D: My Reports -> Edit Own -> Other User Forbidden (403) -> Delete Own."""
    # 1. User A (Owner)
    user_a = {
        "fullName": "Student Alice",
        "email": "alice.test@campus.edu",
        "password": "Password123!",
        "confirmPassword": "Password123!",
    }
    client.post("/api/v1/auth/register", json=user_a)
    login_a = client.post(
        "/api/v1/auth/login",
        json={"email": "alice.test@campus.edu", "password": "Password123!"},
    )
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. User B (Attacker / Other user)
    user_b = {
        "fullName": "Student Bob",
        "email": "bob.test@campus.edu",
        "password": "Password123!",
        "confirmPassword": "Password123!",
    }
    client.post("/api/v1/auth/register", json=user_b)
    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": "bob.test@campus.edu", "password": "Password123!"},
    )
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Alice creates an item
    create_resp = client.post(
        "/api/v1/items",
        json={
            "type": "lost",
            "title": "Alice's Blue RayBan Sunglasses",
            "category": "Accessories",
            "description": "Aviator sunglasses in black hard case.",
            "location": "Quad benches",
            "campus": "Central Campus",
            "date": "2026-10-14",
        },
        headers=headers_a,
    )
    assert create_resp.status_code == 201
    item_id = create_resp.json()["id"]

    # 4. Alice verifies item in /my-listings
    my_resp = client.get("/api/v1/items/my-listings", headers=headers_a)
    assert my_resp.status_code == 200
    assert any(it["id"] == item_id for it in my_resp.json()["items"])

    # 5. Alice updates item status to 'matched'
    update_resp = client.patch(
        f"/api/v1/items/{item_id}",
        json={"status": "matched"},
        headers=headers_a,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "matched"

    # 6. Bob attempts to modify Alice's item -> Must be 403 Forbidden
    bob_mod = client.patch(
        f"/api/v1/items/{item_id}",
        json={"title": "Hacked Title"},
        headers=headers_b,
    )
    assert bob_mod.status_code == 403
    assert "permission" in bob_mod.json()["detail"].lower()

    # 7. Bob attempts to delete Alice's item -> Must be 403 Forbidden
    bob_del = client.delete(f"/api/v1/items/{item_id}", headers=headers_b)
    assert bob_del.status_code == 403

    # 8. Alice deletes her own item -> Succeeds with 204
    alice_del = client.delete(f"/api/v1/items/{item_id}", headers=headers_a)
    assert alice_del.status_code == 204

    # 9. Item no longer exists in repository
    check_deleted = client.get(f"/api/v1/items/{item_id}")
    assert check_deleted.status_code == 404


def test_workflow_e_unauthenticated_protected_routes_rejected(client: TestClient) -> None:
    """WORKFLOW E: Unauthenticated requests to protected endpoints return 401."""
    # 1. Protected item creation
    post_resp = client.post(
        "/api/v1/items",
        json={
            "type": "lost",
            "title": "Anonymous Item",
            "category": "Other",
            "description": "Should fail",
            "location": "Nowhere",
            "date": "2026-10-14",
        },
    )
    assert post_resp.status_code == 401

    # 2. Protected my listings
    my_resp = client.get("/api/v1/items/my-listings")
    assert my_resp.status_code == 401

    # 3. Protected user profile
    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 401
