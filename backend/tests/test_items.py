"""Automated tests for Items API endpoints (Milestone 4: Core Lost & Found Functionality)."""

import pytest
from fastapi.testclient import TestClient

from app.services.item_repository import get_item_repository
from app.services.user_repository import get_user_repository
from app.core.security import create_access_token


@pytest.fixture(autouse=True)
def reset_repositories() -> None:
    """Reset both item and user repositories to fresh seed state before each test."""
    repo = get_item_repository()
    repo.seed_defaults()
    user_repo = get_user_repository()
    user_repo.seed_defaults()


@pytest.fixture
def auth_headers() -> dict:
    """Authentication header for demo user Alex Morgan (usr_demo_01)."""
    token = create_access_token(subject="usr_demo_01")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_user_headers() -> dict:
    """Authentication header for second user Elena Rostova (usr_demo_02)."""
    token = create_access_token(subject="usr_demo_02")
    return {"Authorization": f"Bearer {token}"}


# -----------------------------------------------------------------------------
# 1. Browse & Retrieve Listings
# -----------------------------------------------------------------------------

def test_list_items_default(client: TestClient) -> None:
    """Verify default item listing returns pre-seeded items and pagination metadata."""
    response = client.get("/api/v1/items")
    assert response.status_code == 200

    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 6
    assert len(data["items"]) >= 6
    assert data["storage_mode"] in ["sqlite", "postgresql"]


def test_list_items_filtered_by_type(client: TestClient) -> None:
    """Verify filtering by report type ('lost' vs 'found')."""
    response_lost = client.get("/api/v1/items?type=lost")
    assert response_lost.status_code == 200
    lost_data = response_lost.json()
    assert all(item["type"] == "lost" for item in lost_data["items"])

    response_found = client.get("/api/v1/items?type=found")
    assert response_found.status_code == 200
    found_data = response_found.json()
    assert all(item["type"] == "found" for item in found_data["items"])


def test_list_items_search_query(client: TestClient) -> None:
    """Verify full-text search across item titles and descriptions."""
    response = client.get("/api/v1/items?q=Headphones")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any("Headphones" in item["title"] for item in data["items"])


def test_list_items_pagination(client: TestClient) -> None:
    """Verify pagination skip and limit parameters."""
    response = client.get("/api/v1/items?skip=1&limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["skip"] == 1
    assert data["limit"] == 2


def test_get_item_by_id_success(client: TestClient) -> None:
    """Verify retrieving existing item by ID."""
    response = client.get("/api/v1/items/item_101")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == "item_101"
    assert "Bellroy Leather Wallet" in data["title"]
    assert data["type"] == "lost"


def test_get_item_by_id_not_found(client: TestClient) -> None:
    """Verify 404 response for non-existent item ID."""
    response = client.get("/api/v1/items/item_99999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# -----------------------------------------------------------------------------
# 2. Create Listings (Lost & Found)
# -----------------------------------------------------------------------------

def test_create_lost_item_success(client: TestClient, auth_headers: dict) -> None:
    """Verify authenticated user can create a lost item report."""
    payload = {
        "title": "TI-84 Plus Graphing Calculator",
        "description": "Black graphing calculator with sticker on battery cover.",
        "category": "Electronics",
        "type": "lost",
        "location": "Math Building, Room 102",
        "campus": "Central Campus",
        "date": "2026-10-13",
        "imageUrl": "https://example.com/calculator.jpg",
    }
    response = client.post("/api/v1/items", json=payload, headers=auth_headers)
    assert response.status_code == 201

    created = response.json()
    assert created["title"] == payload["title"]
    assert created["type"] == "lost"
    assert created["id"].startswith("item_")
    assert created["status"] == "open"
    assert created["userId"] == "usr_demo_01"
    assert created["reporterName"] == "Alex Morgan"
    assert created["isDemo"] is True
    assert "createdAt" in created

    # Verify newly created item is retrievable by ID
    fetch_resp = client.get(f"/api/v1/items/{created['id']}")
    assert fetch_resp.status_code == 200
    assert fetch_resp.json()["title"] == payload["title"]


def test_create_found_item_success(client: TestClient, auth_headers: dict) -> None:
    """Verify authenticated user can create a found item report."""
    payload = {
        "title": "Hydro Flask Insulated Tumbler",
        "description": "Mint green 20oz stainless steel tumbler left on bench.",
        "category": "Other",
        "type": "found",
        "location": "Quad benches near fountain",
        "campus": "Central Campus",
        "date": "2026-10-13",
    }
    response = client.post("/api/v1/items", json=payload, headers=auth_headers)
    assert response.status_code == 201

    created = response.json()
    assert created["title"] == payload["title"]
    assert created["type"] == "found"
    assert created["userId"] == "usr_demo_01"


def test_create_item_unauthenticated_rejected(client: TestClient) -> None:
    """Verify unauthenticated user cannot create an item (401 Unauthorized)."""
    payload = {
        "title": "Unauthenticated Report",
        "description": "Should not be created without auth token.",
        "category": "Electronics",
        "type": "lost",
        "location": "Unknown",
        "date": "2026-10-13",
    }
    response = client.post("/api/v1/items", json=payload)
    assert response.status_code == 401


def test_create_item_validation_error(client: TestClient, auth_headers: dict) -> None:
    """Verify validation error on malformed payload."""
    invalid_payload = {
        "title": "A",  # Too short (min length 2)
        "description": "B",  # Too short (min length 3)
        "type": "invalid_type",  # Must be 'lost' or 'found'
        "location": "",
        "date": "2026-10-13",
    }
    response = client.post("/api/v1/items", json=invalid_payload, headers=auth_headers)
    assert response.status_code == 422


# -----------------------------------------------------------------------------
# 3. My Listings & Stats Endpoints
# -----------------------------------------------------------------------------

def test_my_listings_success(client: TestClient, auth_headers: dict) -> None:
    """Verify authenticated user retrieves only listings they created."""
    response = client.get("/api/v1/items/my-listings", headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    assert "items" in data
    # Alex Morgan (usr_demo_01) owns item_101 and item_105 in seed defaults
    assert data["total"] >= 2
    assert all(item["userId"] == "usr_demo_01" for item in data["items"])


def test_my_listings_unauthenticated_rejected(client: TestClient) -> None:
    """Verify unauthenticated access to /my-listings is rejected (401)."""
    response = client.get("/api/v1/items/my-listings")
    assert response.status_code == 401


def test_get_item_stats(client: TestClient, auth_headers: dict) -> None:
    """Verify platform stats aggregation with user-specific metrics."""
    response = client.get("/api/v1/items/stats", headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    assert data["total_items"] >= 6
    assert data["lost_items"] >= 3
    assert data["found_items"] >= 3
    assert data["open_items"] >= 6
    assert data["my_items_count"] >= 2


# -----------------------------------------------------------------------------
# 4. Update Listings & Authorization
# -----------------------------------------------------------------------------

def test_update_item_owner_success(client: TestClient, auth_headers: dict) -> None:
    """Verify listing owner can update their item via PATCH."""
    update_payload = {
        "status": "claimed",
        "location": "Central Library Claimed Counter",
    }
    # item_101 belongs to usr_demo_01
    response = client.patch("/api/v1/items/item_101", json=update_payload, headers=auth_headers)
    assert response.status_code == 200

    updated = response.json()
    assert updated["id"] == "item_101"
    assert updated["status"] == "claimed"
    assert updated["location"] == "Central Library Claimed Counter"
    assert updated["updatedAt"] is not None


def test_put_update_item_owner_success(client: TestClient, auth_headers: dict) -> None:
    """Verify listing owner can update their item via PUT."""
    update_payload = {
        "title": "Midnight Blue Bellroy Wallet (Updated)",
    }
    response = client.put("/api/v1/items/item_101", json=update_payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["title"] == "Midnight Blue Bellroy Wallet (Updated)"


def test_update_item_non_owner_forbidden(client: TestClient, other_user_headers: dict) -> None:
    """Verify non-owner is rejected when trying to update another user's listing (403 Forbidden)."""
    # item_101 belongs to usr_demo_01, caller is usr_demo_02
    response = client.patch(
        "/api/v1/items/item_101",
        json={"title": "Hacked Title"},
        headers=other_user_headers,
    )
    assert response.status_code == 403
    assert "permission" in response.json()["detail"].lower()


def test_update_item_unauthenticated_rejected(client: TestClient) -> None:
    """Verify unauthenticated patch request returns 401."""
    response = client.patch("/api/v1/items/item_101", json={"status": "resolved"})
    assert response.status_code == 401


def test_update_item_not_found(client: TestClient, auth_headers: dict) -> None:
    """Verify 404 response when attempting to update non-existent item."""
    response = client.patch(
        "/api/v1/items/item_nonexistent_999",
        json={"title": "New Title"},
        headers=auth_headers,
    )
    assert response.status_code == 404


# -----------------------------------------------------------------------------
# 5. Delete Listings & Authorization
# -----------------------------------------------------------------------------

def test_delete_item_non_owner_forbidden(client: TestClient, other_user_headers: dict) -> None:
    """Verify non-owner is rejected when trying to delete another user's listing (403 Forbidden)."""
    # item_101 belongs to usr_demo_01, caller is usr_demo_02
    response = client.delete("/api/v1/items/item_101", headers=other_user_headers)
    assert response.status_code == 403
    assert "permission" in response.json()["detail"].lower()

    # Confirm item was NOT deleted
    fetch_resp = client.get("/api/v1/items/item_101")
    assert fetch_resp.status_code == 200


def test_delete_item_unauthenticated_rejected(client: TestClient) -> None:
    """Verify unauthenticated delete request returns 401."""
    response = client.delete("/api/v1/items/item_101")
    assert response.status_code == 401


def test_delete_item_owner_success(client: TestClient, auth_headers: dict) -> None:
    """Verify listing owner can delete their own item."""
    # item_101 belongs to usr_demo_01
    response = client.delete("/api/v1/items/item_101", headers=auth_headers)
    assert response.status_code == 204

    # Confirm it is no longer retrievable
    fetch_resp = client.get("/api/v1/items/item_101")
    assert fetch_resp.status_code == 404


def test_delete_item_not_found(client: TestClient, auth_headers: dict) -> None:
    """Verify 404 response when deleting non-existent item."""
    response = client.delete("/api/v1/items/item_missing_999", headers=auth_headers)
    assert response.status_code == 404


def test_upload_image_success(client: TestClient, auth_headers: dict) -> None:
    """Verify successful image upload, safe filename generation, and static file serving."""
    import io
    dummy_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
    files = {"file": ("test_wallet.png", dummy_png, "image/png")}
    response = client.post("/api/v1/items/upload-image", files=files, headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    assert "url" in data
    assert data["url"].startswith("/uploads/item_")
    assert data["url"].endswith(".png")

    # Verify static file serving
    static_resp = client.get(data["url"])
    assert static_resp.status_code == 200


def test_upload_image_invalid_type_rejected(client: TestClient, auth_headers: dict) -> None:
    """Verify non-image files are rejected with 400 Bad Request."""
    import io
    dummy_txt = io.BytesIO(b"malicious script or text file")
    files = {"file": ("test.txt", dummy_txt, "text/plain")}
    response = client.post("/api/v1/items/upload-image", files=files, headers=auth_headers)
    assert response.status_code == 400
    assert "invalid file type" in response.json()["detail"].lower()


def test_upload_image_unauthenticated_rejected(client: TestClient) -> None:
    """Verify unauthenticated upload requests are rejected with 401."""
    import io
    dummy_png = io.BytesIO(b"dummy image bytes")
    files = {"file": ("photo.png", dummy_png, "image/png")}
    response = client.post("/api/v1/items/upload-image", files=files)
    assert response.status_code == 401


def test_upload_image_production_requires_cloudinary(client: TestClient, auth_headers: dict) -> None:
    """Verify that production mode rejects uploads with 503 when Cloudinary is not configured."""
    import io
    from unittest.mock import patch
    dummy_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
    files = {"file": ("item.png", dummy_png, "image/png")}

    with patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch("app.core.config.settings.CLOUDINARY_CLOUD_NAME", None), \
         patch("app.core.config.settings.CLOUDINARY_API_KEY", None), \
         patch("app.core.config.settings.CLOUDINARY_API_SECRET", None), \
         patch("app.core.config.settings.CLOUDINARY_URL", None):
        response = client.post("/api/v1/items/upload-image", files=files, headers=auth_headers)
        assert response.status_code == 503
        assert "Persistent cloud storage is not configured" in response.json()["detail"]


def test_upload_image_cloudinary_success(client: TestClient, auth_headers: dict) -> None:
    """Verify successful upload when Cloudinary is configured and mock uploader returns secure HTTPS URL."""
    import io
    from unittest.mock import patch
    dummy_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
    files = {"file": ("item.png", dummy_png, "image/png")}

    mock_result = {
        "secure_url": "https://res.cloudinary.com/findit-campus/image/upload/v12345/items/item_test.png",
        "public_id": "findit/items/item_test",
    }

    with patch("app.core.config.settings.CLOUDINARY_CLOUD_NAME", "findit-campus"), \
         patch("app.core.config.settings.CLOUDINARY_API_KEY", "1234567890"), \
         patch("app.core.config.settings.CLOUDINARY_API_SECRET", "mock_secret"), \
         patch("cloudinary.uploader.upload", return_value=mock_result):
        response = client.post("/api/v1/items/upload-image", files=files, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["url"] == "https://res.cloudinary.com/findit-campus/image/upload/v12345/items/item_test.png"
        assert data["filename"] == "findit/items/item_test"
