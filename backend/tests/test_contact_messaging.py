"""Tests for Contact Sharing, WhatsApp Integration, and Internal Messaging."""

import pytest
from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.models.user import User
from app.models.item import Item
from app.models.claim import Claim


def test_contact_profile_update_and_validation(client: TestClient):
    """Test updating user contact info with validation and formatting."""
    # 1. Login as demo user
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "alex.morgan@campus.edu", "password": "CampusPass123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Update contact details with valid mobile and same-as-phone whatsapp
    update_res = client.patch(
        "/api/v1/auth/profile/contact",
        json={
            "phoneNumber": "+91 98765-43210",
            "whatsappSameAsPhone": True,
            "preferredContactMethod": "whatsapp",
        },
        headers=headers,
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["phoneNumber"] == "+919876543210"
    assert data["whatsappNumber"] == "+919876543210"
    assert data["preferredContactMethod"] == "whatsapp"

    # 3. Test invalid phone number format
    bad_res = client.patch(
        "/api/v1/auth/profile/contact",
        json={"phoneNumber": "123"},
        headers=headers,
    )
    assert bad_res.status_code == 422  # validation error


def test_claim_contact_sharing_privacy_and_mutual_consent(client: TestClient):
    """Test strict contact privacy rules: locked on pending, mutual consent required on approved."""
    # User A: Finder (alex.morgan@campus.edu)
    # User B: Claimant (elena.r@campus.edu)
    # User C: Unrelated user (usr_demo_03 or registered)
    
    # 1. Login User A (item reporter)
    res_a = client.post(
        "/api/v1/auth/login",
        json={"email": "alex.morgan@campus.edu", "password": "CampusPass123!"},
    )
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Set contact details for User A
    client.patch(
        "/api/v1/auth/profile/contact",
        json={
            "phoneNumber": "+919876543210",
            "whatsappSameAsPhone": True,
            "preferredContactMethod": "whatsapp",
        },
        headers=headers_a,
    )

    # 2. Login User B (claimant)
    res_b = client.post(
        "/api/v1/auth/login",
        json={"email": "elena.r@campus.edu", "password": "ElenaPass123!"},
    )
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Set contact details for User B
    client.patch(
        "/api/v1/auth/profile/contact",
        json={
            "phoneNumber": "+919123456789",
            "whatsappSameAsPhone": True,
            "preferredContactMethod": "phone_call",
        },
        headers=headers_b,
    )

    # 3. User A posts a found item
    item_res = client.post(
        "/api/v1/items",
        json={
            "type": "found",
            "title": "Black Leather Keyring",
            "category": "Keys",
            "description": "Found near cafeteria bench.",
            "date": "2026-10-15",
            "location": "Cafeteria",
            "campus": "Central Campus",
        },
        headers=headers_a,
    )
    assert item_res.status_code == 201
    item_id = item_res.json()["id"]

    # 4. User B submits a claim
    claim_res = client.post(
        "/api/v1/claims",
        json={
            "itemId": item_id,
            "description": "This is my house keyring with two brass keys.",
            "proofDetails": "Has a small notch on the key ring loop.",
        },
        headers=headers_b,
    )
    assert claim_res.status_code == 201
    claim_id = claim_res.json()["id"]

    # 5. On PENDING claim, contact endpoint returns locked state (no phone numbers)
    contact_pending = client.get(f"/api/v1/claims/{claim_id}/contact", headers=headers_b)
    assert contact_pending.status_code == 200
    assert contact_pending.json()["phoneNumber"] is None
    assert contact_pending.json()["whatsappNumber"] is None
    assert contact_pending.json()["mutualConsent"] is False
    assert contact_pending.json()["canChat"] is False

    # 6. User A approves the claim
    review_res = client.patch(
        f"/api/v1/claims/{claim_id}/review",
        json={"status": "approved", "reviewNotes": "Matched details confirmed."},
        headers=headers_a,
    )
    assert review_res.status_code == 200

    # 7. On APPROVED claim, before consent: numbers are STILL hidden
    contact_appr_1 = client.get(f"/api/v1/claims/{claim_id}/contact", headers=headers_b)
    assert contact_appr_1.json()["phoneNumber"] is None
    assert contact_appr_1.json()["mutualConsent"] is False
    assert contact_appr_1.json()["canChat"] is True  # Chat is available!

    # 8. User B consents to share contact details
    consent_b = client.post(
        f"/api/v1/claims/{claim_id}/contact-consent",
        json={"consent": True},
        headers=headers_b,
    )
    assert consent_b.status_code == 200

    # Only B consented so far: mutualConsent is still False!
    contact_appr_2 = client.get(f"/api/v1/claims/{claim_id}/contact", headers=headers_b)
    assert contact_appr_2.json()["mutualConsent"] is False
    assert contact_appr_2.json()["phoneNumber"] is None

    # 9. User A also consents
    consent_a = client.post(
        f"/api/v1/claims/{claim_id}/contact-consent",
        json={"consent": True},
        headers=headers_a,
    )
    assert consent_a.status_code == 200

    # 10. Now BOTH have consented: Mutual consent is True!
    # User B checks User A's contact info
    contact_b_view = client.get(f"/api/v1/claims/{claim_id}/contact", headers=headers_b)
    assert contact_b_view.json()["mutualConsent"] is True
    assert contact_b_view.json()["phoneNumber"] == "+919876543210"
    assert contact_b_view.json()["whatsappNumber"] == "+919876543210"
    assert "https://wa.me/919876543210" in contact_b_view.json()["whatsappUrl"]

    # User A checks User B's contact info
    contact_a_view = client.get(f"/api/v1/claims/{claim_id}/contact", headers=headers_a)
    assert contact_a_view.json()["mutualConsent"] is True
    assert contact_a_view.json()["phoneNumber"] == "+919123456789"
    assert contact_a_view.json()["preferredMethod"] == "phone_call"

    # 11. Third party unauthorized access is forbidden
    client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Third Party Hacker",
            "email": "intruder@campus.edu",
            "password": "IntruderPass123!",
            "confirmPassword": "IntruderPass123!",
            "campus": "Central Campus",
            "role": "student",
        },
    )
    res_c = client.post(
        "/api/v1/auth/login",
        json={"email": "intruder@campus.edu", "password": "IntruderPass123!"},
    )
    token_c = res_c.json()["access_token"]
    headers_c = {"Authorization": f"Bearer {token_c}"}

    contact_c_view = client.get(f"/api/v1/claims/{claim_id}/contact", headers=headers_c)
    assert contact_c_view.status_code == 403


def test_internal_messaging_flow_and_authorization(client: TestClient):
    """Test conversation messaging between verified claim parties and access controls."""
    # User A (finder) & User B (claimant) from previous claim
    res_a = client.post(
        "/api/v1/auth/login",
        json={"email": "alex.morgan@campus.edu", "password": "CampusPass123!"},
    )
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    res_b = client.post(
        "/api/v1/auth/login",
        json={"email": "elena.r@campus.edu", "password": "ElenaPass123!"},
    )
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # Fetch active claim
    my_claims = client.get("/api/v1/claims/my-claims", headers=headers_b)
    claim_id = my_claims.json()["claims"][0]["id"]

    # 1. User B sends message to User A
    msg_res = client.post(
        f"/api/v1/claims/{claim_id}/messages",
        json={"content": "Hi Alex! Thanks for approving my claim. Where can we meet?"},
        headers=headers_b,
    )
    assert msg_res.status_code == 201
    assert msg_res.json()["content"] == "Hi Alex! Thanks for approving my claim. Where can we meet?"
    assert msg_res.json()["isRead"] is False

    # 2. User A retrieves messages - should mark incoming message as read
    get_msgs_a = client.get(f"/api/v1/claims/{claim_id}/messages", headers=headers_a)
    assert get_msgs_a.status_code == 200
    msgs = get_msgs_a.json()["messages"]
    assert len(msgs) >= 1
    assert msgs[-1]["content"] == "Hi Alex! Thanks for approving my claim. Where can we meet?"

    # 3. User A replies
    reply_res = client.post(
        f"/api/v1/claims/{claim_id}/messages",
        json={"content": "Let's meet at Central Library ground floor at 3 PM."},
        headers=headers_a,
    )
    assert reply_res.status_code == 201

    # 4. Check active conversations list
    convs_res = client.get("/api/v1/claims/conversations/active", headers=headers_b)
    assert convs_res.status_code == 200
    convs = convs_res.json()["conversations"]
    assert len(convs) >= 1
    assert convs[0]["claimId"] == claim_id
    assert "Central Library" in (convs[0]["lastMessage"] or "")

    # 5. Third party cannot read or send messages in this conversation
    res_c = client.post(
        "/api/v1/auth/login",
        json={"email": "intruder@campus.edu", "password": "IntruderPass123!"},
    )
    headers_c = {"Authorization": f"Bearer {res_c.json()['access_token']}"}

    msg_c = client.get(f"/api/v1/claims/{claim_id}/messages", headers=headers_c)
    assert msg_c.status_code == 403

    send_c = client.post(
        f"/api/v1/claims/{claim_id}/messages",
        json={"content": "I am an unauthorized intruder."},
        headers=headers_c,
    )
    assert send_c.status_code == 403

    # 6. User A confirms return handover
    complete_res = client.post(
        f"/api/v1/claims/{claim_id}/complete",
        json={"completionNotes": "Keys returned in person safely."},
        headers=headers_a,
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"
    assert complete_res.json()["handoverStatus"] == "returned_successfully"
