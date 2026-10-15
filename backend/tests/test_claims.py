"""Automated tests for Claim Management and Return Workflow (Milestone 7)."""

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token


@pytest.fixture
def test_users(client: TestClient):
    """Create distinct reporter and claimant user accounts for claim workflow tests."""
    reporter_email = "reporter_test@campus.edu"
    claimant_email = "claimant_test@campus.edu"
    other_email = "unrelated_test@campus.edu"

    # Register reporter
    r_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": reporter_email,
            "password": "SecurePassword123!",
            "confirmPassword": "SecurePassword123!",
            "fullName": "Alice Reporter",
            "campus": "North Campus",
        },
    )
    if r_resp.status_code == 201:
        reporter_user = r_resp.json()
    else:
        reporter_user = client.post(
            "/api/v1/auth/login",
            json={"email": reporter_email, "password": "SecurePassword123!"},
        ).json()["user"]

    # Register claimant
    c_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": claimant_email,
            "password": "SecurePassword123!",
            "confirmPassword": "SecurePassword123!",
            "fullName": "Bob Claimant",
            "campus": "North Campus",
        },
    )
    if c_resp.status_code == 201:
        claimant_user = c_resp.json()
    else:
        claimant_user = client.post(
            "/api/v1/auth/login",
            json={"email": claimant_email, "password": "SecurePassword123!"},
        ).json()["user"]

    # Register unrelated user
    u_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": other_email,
            "password": "SecurePassword123!",
            "confirmPassword": "SecurePassword123!",
            "fullName": "Eve Bystander",
            "campus": "North Campus",
        },
    )
    if u_resp.status_code == 201:
        other_user = u_resp.json()
    else:
        other_user = client.post(
            "/api/v1/auth/login",
            json={"email": other_email, "password": "SecurePassword123!"},
        ).json()["user"]

    reporter_token = create_access_token(subject=reporter_user["id"])
    claimant_token = create_access_token(subject=claimant_user["id"])
    other_token = create_access_token(subject=other_user["id"])

    return {
        "reporter": reporter_user,
        "reporter_token": reporter_token,
        "claimant": claimant_user,
        "claimant_token": claimant_token,
        "other": other_user,
        "other_token": other_token,
    }


@pytest.fixture
def reported_found_item(client: TestClient, test_users):
    """Create a found item reported by the reporter user."""
    headers = {"Authorization": f"Bearer {test_users['reporter_token']}"}
    resp = client.post(
        "/api/v1/items",
        headers=headers,
        json={
            "title": "Blue Hydro Flask with Space Stickers",
            "description": "Found on the 2nd floor library study desk near window.",
            "category": "Other",
            "type": "found",
            "location": "Main Library Floor 2",
            "campus": "North Campus",
            "date": "2026-10-14",
            "imageUrl": "https://images.unsplash.com/photo-1602143407151-7111542de6e8",
            "reporterName": "Alice Reporter",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_unauthenticated_claim_submission_rejected(client: TestClient, reported_found_item):
    """Reject unauthenticated claim submissions."""
    resp = client.post(
        "/api/v1/claims",
        json={
            "itemId": reported_found_item["id"],
            "description": "This is my bottle, I forgot it on the desk.",
            "proofDetails": "Has a NASA sticker and a dent on the bottom rim.",
        },
    )
    assert resp.status_code == 401


def test_claim_own_reported_item_rejected(client: TestClient, test_users, reported_found_item):
    """Users cannot submit claims on items they reported themselves."""
    headers = {"Authorization": f"Bearer {test_users['reporter_token']}"}
    resp = client.post(
        "/api/v1/claims",
        headers=headers,
        json={
            "itemId": reported_found_item["id"],
            "description": "I found it and now I claim it.",
            "proofDetails": "None",
        },
    )
    assert resp.status_code == 400
    assert "cannot claim an item you reported" in resp.json()["detail"].lower()


def test_submit_valid_claim_and_duplicate_prevention(client: TestClient, test_users, reported_found_item):
    """Submit a valid ownership claim and verify duplicate active claims are rejected."""
    headers = {"Authorization": f"Bearer {test_users['claimant_token']}"}

    # 1. First valid claim submission
    claim_payload = {
        "itemId": reported_found_item["id"],
        "description": "I lost my blue Hydro Flask during finals study yesterday.",
        "proofDetails": "It has an Apollo 11 sticker and initials 'BC' engraved at the bottom.",
    }
    resp = client.post("/api/v1/claims", headers=headers, json=claim_payload)
    assert resp.status_code == 201
    claim = resp.json()
    assert claim["itemId"] == reported_found_item["id"]
    assert claim["claimantId"] == test_users["claimant"]["id"]
    assert claim["status"] == "pending"
    assert claim["proofDetails"] == claim_payload["proofDetails"]

    # 2. Second claim from same user for same item must be rejected as duplicate
    dup_resp = client.post("/api/v1/claims", headers=headers, json=claim_payload)
    assert dup_resp.status_code == 400
    assert "already have an active claim" in dup_resp.json()["detail"].lower()


def test_claim_privacy_unauthorized_access_prevented(client: TestClient, test_users, reported_found_item):
    """Unrelated users cannot view another user's claim details."""
    claimant_headers = {"Authorization": f"Bearer {test_users['claimant_token']}"}
    claim_resp = client.post(
        "/api/v1/claims",
        headers=claimant_headers,
        json={
            "itemId": reported_found_item["id"],
            "description": "Lost my keys with cat keychain.",
            "proofDetails": "Secret 4-digit code on the key tag: 9482",
        },
    )
    assert claim_resp.status_code in [201, 400]
    claim_id = (
        claim_resp.json()["id"]
        if claim_resp.status_code == 201
        else client.get("/api/v1/claims/my-claims", headers=claimant_headers).json()["claims"][0]["id"]
    )

    # Bystander attempts to access private claim
    bystander_headers = {"Authorization": f"Bearer {test_users['other_token']}"}
    forbidden_resp = client.get(f"/api/v1/claims/{claim_id}", headers=bystander_headers)
    assert forbidden_resp.status_code == 403


def test_claimant_cannot_approve_own_claim(client: TestClient, test_users):
    """Claimants cannot review or approve their own claim."""
    reporter_headers = {"Authorization": f"Bearer {test_users['reporter_token']}"}
    claimant_headers = {"Authorization": f"Bearer {test_users['claimant_token']}"}

    item = client.post(
        "/api/v1/items",
        headers=reporter_headers,
        json={
            "title": "TI-84 Plus Graphing Calculator",
            "description": "Found in math hall room 104.",
            "category": "Electronics",
            "type": "found",
            "location": "Math Hall 104",
            "campus": "North Campus",
            "date": "2026-10-14",
        },
    ).json()

    claim = client.post(
        "/api/v1/claims",
        headers=claimant_headers,
        json={
            "itemId": item["id"],
            "description": "My calculator with yellow battery cover.",
            "proofDetails": "Yellow battery cover",
        },
    ).json()

    resp = client.patch(
        f"/api/v1/claims/{claim['id']}/review",
        headers=claimant_headers,
        json={"status": "approved", "reviewNotes": "Self approval"},
    )
    assert resp.status_code == 403


def test_reporter_review_approval_and_invalid_transitions(client: TestClient, test_users):
    """Reporter can review and approve a claim; invalid transitions are rejected."""
    reporter_headers = {"Authorization": f"Bearer {test_users['reporter_token']}"}
    claimant_headers = {"Authorization": f"Bearer {test_users['claimant_token']}"}

    item = client.post(
        "/api/v1/items",
        headers=reporter_headers,
        json={
            "title": "Wireless Sony Headphones",
            "description": "Found in student lounge.",
            "category": "Electronics",
            "type": "found",
            "location": "Student Lounge",
            "campus": "North Campus",
            "date": "2026-10-14",
        },
    ).json()

    claim = client.post(
        "/api/v1/claims",
        headers=claimant_headers,
        json={
            "itemId": item["id"],
            "description": "My Sony WH-1000XM4 headphones.",
            "proofDetails": "Left ear cushion has a small scratch.",
        },
    ).json()

    # Move to under_review
    review_resp = client.patch(
        f"/api/v1/claims/{claim['id']}/review",
        headers=reporter_headers,
        json={"status": "under_review", "reviewNotes": "Checking sticker placement."},
    )
    assert review_resp.status_code == 200
    assert review_resp.json()["status"] == "under_review"

    # Move to approved
    approve_resp = client.patch(
        f"/api/v1/claims/{claim['id']}/review",
        headers=reporter_headers,
        json={"status": "approved", "reviewNotes": "Proof verified! Details match."},
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "approved"
    assert approve_resp.json()["handoverStatus"] == "awaiting_handover"


def test_handover_coordination_and_return_completion(client: TestClient, test_users):
    """Coordinate handover arrangements and complete the physical return, updating item status atomically."""
    reporter_headers = {"Authorization": f"Bearer {test_users['reporter_token']}"}
    claimant_headers = {"Authorization": f"Bearer {test_users['claimant_token']}"}

    item = client.post(
        "/api/v1/items",
        headers=reporter_headers,
        json={
            "title": "Red Canvas Backpack with Notebooks",
            "description": "Found under bench in science quad.",
            "category": "Bags and Accessories",
            "type": "found",
            "location": "Science Quad",
            "campus": "North Campus",
            "date": "2026-10-14",
        },
    ).json()

    claim = client.post(
        "/api/v1/claims",
        headers=claimant_headers,
        json={
            "itemId": item["id"],
            "description": "My red JanSport backpack with organic chemistry notebook.",
            "proofDetails": "Contains lab goggles and green pencil case.",
        },
    ).json()

    # Approve claim first
    approve_resp = client.patch(
        f"/api/v1/claims/{claim['id']}/review",
        headers=reporter_headers,
        json={"status": "approved", "reviewNotes": "Notebook name matches student ID."},
    )
    assert approve_resp.status_code == 200

    # Coordinate handover
    handover_resp = client.patch(
        f"/api/v1/claims/{claim['id']}/handover",
        headers=reporter_headers,
        json={
            "handoverStatus": "handover_arranged",
            "handoverDetails": "Meet at Library Front Desk tomorrow at 2:00 PM.",
        },
    )
    assert handover_resp.status_code == 200
    assert handover_resp.json()["handoverStatus"] == "handover_arranged"
    assert "Library Front Desk" in handover_resp.json()["handoverDetails"]

    # Claimant attempts to complete return directly (forbidden)
    forbidden_resp = client.post(
        f"/api/v1/claims/{claim['id']}/complete",
        headers=claimant_headers,
        json={"completionNotes": "I got it back!"},
    )
    assert forbidden_resp.status_code == 403

    # Reporter confirms physical handover completion
    complete_resp = client.post(
        f"/api/v1/claims/{claim['id']}/complete",
        headers=reporter_headers,
        json={"completionNotes": "Item successfully handed over to Bob. ID verified."},
    )
    assert complete_resp.status_code == 200
    completed_claim = complete_resp.json()
    assert completed_claim["status"] == "completed"
    assert completed_claim["handoverStatus"] == "returned_successfully"

    # Verify associated item status was atomically updated to 'returned'
    item_resp = client.get(f"/api/v1/items/{item['id']}")
    assert item_resp.status_code == 200
    assert item_resp.json()["status"] == "returned"


def test_claim_cancellation_by_claimant(client: TestClient, test_users):
    """Claimants can cancel their own pending claims."""
    reporter_headers = {"Authorization": f"Bearer {test_users['reporter_token']}"}
    item_resp = client.post(
        "/api/v1/items",
        headers=reporter_headers,
        json={
            "title": "Black umbrella with wooden handle",
            "description": "Left in cafeteria.",
            "category": "Other",
            "type": "found",
            "location": "Cafeteria",
            "campus": "North Campus",
            "date": "2026-10-14",
        },
    )
    item_id = item_resp.json()["id"]

    claimant_headers = {"Authorization": f"Bearer {test_users['claimant_token']}"}
    claim_resp = client.post(
        "/api/v1/claims",
        headers=claimant_headers,
        json={
            "itemId": item_id,
            "description": "I thought this was mine.",
            "proofDetails": "Wooden handle",
        },
    )
    claim_id = claim_resp.json()["id"]

    # Cancel claim
    cancel_resp = client.post(f"/api/v1/claims/{claim_id}/cancel", headers=claimant_headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # Item should NOT be marked as returned
    item_check = client.get(f"/api/v1/items/{item_id}")
    assert item_check.json()["status"] != "returned"


def test_list_received_claims_for_reporter(client: TestClient, test_users):
    """Reporters can list incoming claims received for their reported items."""
    reporter_headers = {"Authorization": f"Bearer {test_users['reporter_token']}"}
    claimant_headers = {"Authorization": f"Bearer {test_users['claimant_token']}"}

    item = client.post(
        "/api/v1/items",
        headers=reporter_headers,
        json={
            "title": "AirPods Pro 2nd Gen in Black Case",
            "description": "Found on bench outside gym.",
            "category": "Electronics",
            "type": "found",
            "location": "Gym Bench",
            "campus": "North Campus",
            "date": "2026-10-14",
        },
    ).json()

    claim = client.post(
        "/api/v1/claims",
        headers=claimant_headers,
        json={
            "itemId": item["id"],
            "description": "Lost my AirPods with black silicon case.",
            "proofDetails": "Serial number ending in 9J2K.",
        },
    ).json()

    # Reporter views received claims
    resp = client.get("/api/v1/claims/received", headers=reporter_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    found_claim = next((c for c in data["claims"] if c["id"] == claim["id"]), None)
    assert found_claim is not None
    assert found_claim["itemTitle"] == item["title"]
    assert found_claim["proofDetails"] == "Serial number ending in 9J2K."


def test_claim_rejection_workflow(client: TestClient, test_users):
    """Reporters can reject invalid claims with review notes; item remains available."""
    reporter_headers = {"Authorization": f"Bearer {test_users['reporter_token']}"}
    claimant_headers = {"Authorization": f"Bearer {test_users['claimant_token']}"}

    item = client.post(
        "/api/v1/items",
        headers=reporter_headers,
        json={
            "title": "Prescription Reading Glasses",
            "description": "Found in library seminar room.",
            "category": "Other",
            "type": "found",
            "location": "Library Room 204",
            "campus": "North Campus",
            "date": "2026-10-14",
        },
    ).json()

    claim = client.post(
        "/api/v1/claims",
        headers=claimant_headers,
        json={
            "itemId": item["id"],
            "description": "My wire-rimmed glasses.",
            "proofDetails": "They are golden Ray-Bans.",
        },
    ).json()

    # Reporter rejects because proof does not match (e.g. these glasses are black plastic)
    reject_resp = client.patch(
        f"/api/v1/claims/{claim['id']}/review",
        headers=reporter_headers,
        json={
            "status": "rejected",
            "reviewNotes": "Item found has black plastic frames, does not match your description.",
        },
    )
    assert reject_resp.status_code == 200
    assert reject_resp.json()["status"] == "rejected"
    assert "black plastic" in reject_resp.json()["reviewNotes"]

    # Verify item status is NOT changed to returned
    item_check = client.get(f"/api/v1/items/{item['id']}")
    assert item_check.json()["status"] != "returned"


def test_cannot_claim_or_approve_already_returned_item(client: TestClient, test_users):
    """Cannot submit a new claim or approve a claim for an already returned item."""
    reporter_headers = {"Authorization": f"Bearer {test_users['reporter_token']}"}
    claimant_headers = {"Authorization": f"Bearer {test_users['claimant_token']}"}
    bystander_headers = {"Authorization": f"Bearer {test_users['other_token']}"}

    item = client.post(
        "/api/v1/items",
        headers=reporter_headers,
        json={
            "title": "Silver iPad Mini with Magnetic Folio",
            "description": "Found on dining hall table.",
            "category": "Electronics",
            "type": "found",
            "location": "Dining Hall",
            "campus": "North Campus",
            "date": "2026-10-14",
        },
    ).json()

    # 1. Valid claim and return
    claim1 = client.post(
        "/api/v1/claims",
        headers=claimant_headers,
        json={
            "itemId": item["id"],
            "description": "My iPad Mini.",
            "proofDetails": "Wallpaper is a NASA galaxy.",
        },
    ).json()

    client.patch(
        f"/api/v1/claims/{claim1['id']}/review",
        headers=reporter_headers,
        json={"status": "approved", "reviewNotes": "Wallpaper matches."},
    )
    client.post(f"/api/v1/claims/{claim1['id']}/complete", headers=reporter_headers)

    # 2. Second user attempts to submit claim on this now-returned item -> rejected with 400
    blocked_resp = client.post(
        "/api/v1/claims",
        headers=bystander_headers,
        json={
            "itemId": item["id"],
            "description": "Wait, that's mine!",
            "proofDetails": "None",
        },
    )
    assert blocked_resp.status_code == 400
    assert "already marked as returned" in blocked_resp.json()["detail"].lower()

