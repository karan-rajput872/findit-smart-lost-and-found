"""Automated tests for In-App Notifications and Alerts (Milestone 7)."""

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token


@pytest.fixture
def notif_users(client: TestClient):
    """Register two distinct users for notification testing."""
    u1_email = "user_one_notif@campus.edu"
    u2_email = "user_two_notif@campus.edu"

    r1 = client.post(
        "/api/v1/auth/register",
        json={
            "email": u1_email,
            "password": "SecurePassword123!",
            "confirmPassword": "SecurePassword123!",
            "fullName": "User One",
            "campus": "North Campus",
        },
    )
    user1 = r1.json() if r1.status_code == 201 else client.post(
        "/api/v1/auth/login",
        json={"email": u1_email, "password": "SecurePassword123!"},
    ).json()["user"]

    r2 = client.post(
        "/api/v1/auth/register",
        json={
            "email": u2_email,
            "password": "SecurePassword123!",
            "confirmPassword": "SecurePassword123!",
            "fullName": "User Two",
            "campus": "North Campus",
        },
    )
    user2 = r2.json() if r2.status_code == 201 else client.post(
        "/api/v1/auth/login",
        json={"email": u2_email, "password": "SecurePassword123!"},
    ).json()["user"]

    return {
        "user1": user1,
        "token1": create_access_token(subject=user1["id"]),
        "user2": user2,
        "token2": create_access_token(subject=user2["id"]),
    }


def test_notifications_created_on_claim_lifecycle(client: TestClient, notif_users):
    """Verify notifications are automatically dispatched across the claim lifecycle."""
    headers1 = {"Authorization": f"Bearer {notif_users['token1']}"}
    headers2 = {"Authorization": f"Bearer {notif_users['token2']}"}

    # User 1 reports found item
    item_resp = client.post(
        "/api/v1/items",
        headers=headers1,
        json={
            "title": "Silver Watch with Leather Strap",
            "description": "Found near athletic gym locker room.",
            "category": "Jewelry & Watches",
            "type": "found",
            "location": "Gym Locker Room",
            "campus": "North Campus",
            "date": "2026-10-14",
        },
    )
    item_id = item_resp.json()["id"]

    # User 2 claims item
    claim_resp = client.post(
        "/api/v1/claims",
        headers=headers2,
        json={
            "itemId": item_id,
            "description": "This is my Fossil watch.",
            "proofDetails": "Engraved with '2022' on back.",
        },
    )
    assert claim_resp.status_code == 201

    # Check that User 1 (reporter) received a notification
    u1_notifs = client.get("/api/v1/notifications", headers=headers1).json()
    assert u1_notifs["total"] > 0
    latest_u1 = u1_notifs["notifications"][0]
    assert latest_u1["notificationType"] == "claim_submitted"
    assert "Silver Watch" in latest_u1["message"] or "Silver Watch" in latest_u1["title"]

    # Check that User 2 (claimant) received a confirmation notification
    u2_notifs = client.get("/api/v1/notifications", headers=headers2).json()
    assert u2_notifs["total"] > 0
    latest_u2 = u2_notifs["notifications"][0]
    assert latest_u2["notificationType"] == "claim_submitted"


def test_user_isolation_and_unread_count(client: TestClient, notif_users):
    """Ensure users only see their own notifications and unread counts match."""
    headers1 = {"Authorization": f"Bearer {notif_users['token1']}"}
    headers2 = {"Authorization": f"Bearer {notif_users['token2']}"}

    # Fetch unread count for user 1
    count_resp = client.get("/api/v1/notifications/unread-count", headers=headers1)
    assert count_resp.status_code == 200
    assert "unreadCount" in count_resp.json()

    # User 1 cannot access another user's notifications
    resp1 = client.get("/api/v1/notifications", headers=headers1).json()
    for notif in resp1["notifications"]:
        assert notif["userId"] == notif_users["user1"]["id"]


def test_mark_notification_as_read_and_mark_all_read(client: TestClient, notif_users):
    """Mark single notification as read, then mark all as read."""
    headers1 = {"Authorization": f"Bearer {notif_users['token1']}"}

    notifs_resp = client.get("/api/v1/notifications", headers=headers1)
    assert notifs_resp.status_code == 200
    data = notifs_resp.json()
    if data["total"] > 0:
        notif_id = data["notifications"][0]["id"]

        # Mark single as read
        read_resp = client.patch(f"/api/v1/notifications/{notif_id}/read", headers=headers1)
        assert read_resp.status_code == 200
        assert read_resp.json()["isRead"] is True

        # Mark all as read
        mark_all_resp = client.post("/api/v1/notifications/mark-all-read", headers=headers1)
        assert mark_all_resp.status_code == 200

        # Unread count should now be 0
        count_resp = client.get("/api/v1/notifications/unread-count", headers=headers1)
        assert count_resp.json()["unreadCount"] == 0


def test_delete_notification_and_unauthorized_protection(client: TestClient, notif_users):
    """Users can delete their notifications; others cannot delete them."""
    headers1 = {"Authorization": f"Bearer {notif_users['token1']}"}
    headers2 = {"Authorization": f"Bearer {notif_users['token2']}"}

    # Fetch user 1 notifications
    notifs_resp = client.get("/api/v1/notifications", headers=headers1)
    data = notifs_resp.json()
    assert data["total"] > 0
    target_id = data["notifications"][0]["id"]

    # User 2 attempts to delete User 1's notification -> 404/403 forbidden
    forbidden_del = client.delete(f"/api/v1/notifications/{target_id}", headers=headers2)
    assert forbidden_del.status_code == 404

    # User 1 successfully deletes own notification
    ok_del = client.delete(f"/api/v1/notifications/{target_id}", headers=headers1)
    assert ok_del.status_code == 204

