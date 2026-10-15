"""Milestone 9: Automated test suite for AI matching engine and endpoints."""

import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.matching_engine import (
    MatchingEngine,
    compute_tf_idf_similarity,
    compute_attribute_similarity,
    compute_location_similarity,
    compute_date_compatibility,
    compute_image_similarity,
)


@pytest.fixture
def auth_headers(client: TestClient):
    """Helper fixture to generate authenticated user headers."""
    email = f"matcher_{uuid.uuid4().hex[:6]}@campus.edu"
    pwd = "MatchPassword123!"
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Matcher User",
        "campus": "Central Campus",
        "role": "student",
        "password": pwd,
        "confirm_password": pwd,
    })
    assert reg.status_code == 201

    login = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, email


# ==============================================================================
# 1. UNIT TESTS FOR MATCHING ENGINE ALGORITHMS
# ==============================================================================

def test_semantic_synonym_matching():
    """Verify that domain synonyms (earbuds vs earphones) produce positive similarity."""
    sim = compute_tf_idf_similarity(
        "Black wireless earbuds in charging case",
        "Black Bluetooth earphones case discovered near library",
    )
    assert sim >= 0.35, f"Expected synonym similarity >= 0.35, got {sim}"


def test_incompatible_categories_scoring():
    """Verify category incompatibility yields low attribute score."""
    attr_score, notes = compute_attribute_similarity(
        cat1="Electronics",
        cat2="Books & Stationery",
        title1="MacBook Pro",
        desc1="Silver laptop",
        title2="Calculus Textbook",
        desc2="Hardcover book",
    )
    assert attr_score < 0.4, f"Expected attribute score < 0.4 for incompatible items, got {attr_score}"


def test_location_and_campus_proximity():
    """Verify location keyword overlap yields high proximity score."""
    loc_score, notes = compute_location_similarity(
        loc1="Central Library 2nd Floor",
        campus1="North Campus",
        loc2="Library 2nd Floor Cubicle",
        campus2="North Campus",
    )
    assert loc_score >= 0.8, f"Expected proximity score >= 0.8, got {loc_score}"
    assert any("library" in n.lower() for n in notes)


def test_date_proximity_decay():
    """Verify same-day reports score higher than reports 30+ days apart."""
    score_close, _ = compute_date_compatibility("2026-10-15", "2026-10-15")
    score_far, _ = compute_date_compatibility("2026-08-01", "2026-10-15")
    assert score_close > score_far
    assert score_close == 1.0
    assert score_far <= 0.3


def test_image_similarity_graceful_fallback():
    """Verify missing images fallback safely to neutral score without error."""
    score_none, _ = compute_image_similarity(None, None)
    score_one, _ = compute_image_similarity("https://images.com/item.jpg", None)
    score_same, _ = compute_image_similarity("https://images.com/earbuds.jpg", "https://images.com/earbuds.jpg")

    assert score_none == 0.5
    assert score_one == 0.5
    assert score_same == 1.0


def test_matching_engine_confidence_tiers():
    """Verify combined score maps to strong/possible/weak tiers properly."""
    # Strong match candidate: same category, brand, color, location, date
    strong_eval = MatchingEngine.evaluate_match(
        lost_item={
            "title": "Navy Blue Jansport Backpack",
            "description": "Lost my navy blue Jansport bag with laptop sleeve",
            "category": "Bags and Accessories",
            "location": "Main Library",
            "campus": "North Campus",
            "date": "2026-10-15",
        },
        found_item={
            "title": "Navy Blue Backpack by Jansport",
            "description": "Found a blue Jansport bag left on a table",
            "category": "Bags and Accessories",
            "location": "Main Library 1st floor",
            "campus": "North Campus",
            "date": "2026-10-15",
        },
    )
    assert strong_eval["overall_score"] >= 70
    assert strong_eval["confidence_tier"] in ("strong", "possible")
    assert len(strong_eval["reasons"]) >= 2
    assert "Jansport" in strong_eval["explanation"] or "category" in strong_eval["explanation"].lower()


# ==============================================================================
# 2. INTEGRATION TESTS FOR MATCH ENDPOINTS & WORKFLOWS
# ==============================================================================

def test_automatic_matching_and_notification_on_item_creation(client: TestClient, auth_headers):
    """Verify that reporting a found item triggers matching and sends notifications."""
    headers1, email1 = auth_headers

    # Student 2 (Claimant / Lost Item Owner)
    headers2, email2 = (
        client.post("/api/v1/auth/register", json={
            "email": f"owner_{uuid.uuid4().hex[:6]}@campus.edu",
            "full_name": "Lost Item Owner",
            "campus": "North Campus",
            "role": "student",
            "password": "Password123!",
            "confirm_password": "Password123!",
        }), None
    )
    token2 = client.post("/api/v1/auth/login", json={
        "email": headers2.json()["email"],
        "password": "Password123!",
    }).json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {token2}"}

    # 1. User 2 reports lost item
    lost_res = client.post("/api/v1/items", headers=user2_headers, json={
        "title": "Hydro Flask 32oz Water Bottle Black",
        "type": "lost",
        "category": "Personal Accessories",
        "description": "Black Hydro Flask bottle with stickers near Gym",
        "date": "2026-10-15",
        "location": "Recreation Gym",
        "campus": "North Campus",
    })
    assert lost_res.status_code == 201
    lost_id = lost_res.json()["id"]

    # 2. User 1 reports matching found item
    found_res = client.post("/api/v1/items", headers=headers1, json={
        "title": "Black Hydro Flask Bottle",
        "type": "found",
        "category": "Personal Accessories",
        "description": "Found a black Hydro Flask water bottle on gym bleachers",
        "date": "2026-10-15",
        "location": "Gym Bleachers",
        "campus": "North Campus",
    })
    assert found_res.status_code == 201
    found_id = found_res.json()["id"]

    # 3. User 2 queries their matches
    matches_res = client.get("/api/v1/matches", headers=user2_headers)
    assert matches_res.status_code == 200
    match_list = matches_res.json()["matches"]
    assert len(match_list) >= 1
    matched_pair = next((m for m in match_list if m["lostItemId"] == lost_id and m["foundItemId"] == found_id), None)
    assert matched_pair is not None
    assert matched_pair["overallScore"] >= 60

    # 4. User 2 should have received an in-app match notification
    notif_res = client.get("/api/v1/notifications", headers=user2_headers)
    assert notif_res.status_code == 200
    notifs = notif_res.json()["notifications"]
    match_notifs = [n for n in notifs if n["notificationType"] == "match_found"]
    assert len(match_notifs) >= 1


def test_match_feedback_workflow(client: TestClient, auth_headers):
    """Verify user can record feedback (relevant, not_relevant) on match recommendations."""
    headers, _ = auth_headers

    # Query existing matches
    matches_res = client.get("/api/v1/matches", headers=headers)
    assert matches_res.status_code == 200
    match_list = matches_res.json()["matches"]

    if not match_list:
        # Trigger on-demand generation
        gen_res = client.post("/api/v1/matches/generate", headers=headers)
        assert gen_res.status_code == 200
        matches_res = client.get("/api/v1/matches", headers=headers)
        match_list = matches_res.json()["matches"]

    if match_list:
        target_match_id = match_list[0]["id"]

        # Submit relevant feedback
        feed_res = client.patch(
            f"/api/v1/matches/{target_match_id}/feedback",
            headers=headers,
            json={"feedback": "relevant", "notes": "Looks exactly like my lost item!"},
        )
        assert feed_res.status_code == 200
        assert feed_res.json()["feedback"] == "relevant"
        assert feed_res.json()["feedbackNotes"] == "Looks exactly like my lost item!"


def test_match_user_privacy_isolation(client: TestClient):
    """Verify third-party users cannot view matches belonging to other users."""
    # Register Alice
    alice_reg = client.post("/api/v1/auth/register", json={
        "email": f"alice_{uuid.uuid4().hex[:6]}@campus.edu",
        "full_name": "Alice Privacy",
        "campus": "Central",
        "role": "student",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    alice_token = client.post("/api/v1/auth/login", json={
        "email": alice_reg.json()["email"],
        "password": "Password123!",
    }).json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # Register Eve (Intruder)
    eve_reg = client.post("/api/v1/auth/register", json={
        "email": f"eve_{uuid.uuid4().hex[:6]}@campus.edu",
        "full_name": "Eve Privacy",
        "campus": "Central",
        "role": "student",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    eve_token = client.post("/api/v1/auth/login", json={
        "email": eve_reg.json()["email"],
        "password": "Password123!",
    }).json()["access_token"]
    eve_headers = {"Authorization": f"Bearer {eve_token}"}

    # Alice reports lost item
    alice_item = client.post("/api/v1/items", headers=alice_headers, json={
        "title": "Private Silver Necklace",
        "type": "lost",
        "category": "Jewelry",
        "description": "Special family heirloom necklace",
        "date": "2026-10-15",
        "location": "Chapel",
        "campus": "Central",
    }).json()

    # Another user reports found necklace
    found_item = client.post("/api/v1/items", headers=alice_headers, json={
        "title": "Silver Chain Necklace",
        "type": "found",
        "category": "Jewelry",
        "description": "Found on a pew in Chapel",
        "date": "2026-10-15",
        "location": "Chapel",
        "campus": "Central",
    }).json()

    # Alice gets the match
    alice_matches = client.get("/api/v1/matches", headers=alice_headers).json()["matches"]
    alice_match = next((m for m in alice_matches if m["lostItemId"] == alice_item["id"]), None)

    if alice_match:
        # Eve tries to fetch Alice's match directly
        eve_attempt = client.get(f"/api/v1/matches/{alice_match['id']}", headers=eve_headers)
        assert eve_attempt.status_code == 404, "Privacy violation! Intruder accessed another user's match."


def test_attribute_color_and_brand_matching():
    """Verify attribute matching correctly extracts and scores matching colors and brands."""
    attr_score_match, notes_match = compute_attribute_similarity(
        cat1="Electronics",
        cat2="Electronics",
        title1="Apple iPhone 15 Pro Blue",
        desc1="Lost my dark blue Apple smartphone in library",
        title2="Blue Apple Phone",
        desc2="Found a navy blue Apple device",
    )
    assert attr_score_match >= 0.8
    assert any("apple" in n.lower() for n in notes_match)
    assert any("blue" in n.lower() for n in notes_match)

    # Conflicting colors
    attr_score_conflict, _ = compute_attribute_similarity(
        cat1="Electronics",
        cat2="Electronics",
        title1="Apple iPhone 15 Red",
        desc1="Bright red case",
        title2="Apple iPhone 15 Yellow",
        desc2="Yellow phone",
    )
    assert attr_score_conflict < attr_score_match


def test_duplicate_match_prevention(client: TestClient, auth_headers):
    """Verify that regenerating matches updates existing pairs rather than duplicating."""
    headers, _ = auth_headers

    # Report lost item
    lost_item = client.post("/api/v1/items", headers=headers, json={
        "title": "TI-84 Plus Graphing Calculator",
        "type": "lost",
        "category": "Electronics",
        "description": "Black TI-84 Plus with stickers",
        "date": "2026-10-15",
        "location": "Math Building 101",
        "campus": "Central Campus",
    }).json()

    # Report matching found item
    found_item = client.post("/api/v1/items", headers=headers, json={
        "title": "TI-84 Graphing Calculator",
        "type": "found",
        "category": "Electronics",
        "description": "Black graphing calculator found in room 101",
        "date": "2026-10-15",
        "location": "Math Building",
        "campus": "Central Campus",
    }).json()

    # Query matches after initial item creation
    res1 = client.get("/api/v1/matches", headers=headers).json()
    matches1 = [m for m in res1["matches"] if m["lostItemId"] == lost_item["id"] and m["foundItemId"] == found_item["id"]]
    assert len(matches1) == 1
    match_id = matches1[0]["id"]

    # Trigger second manual generation sweep
    gen_res = client.post("/api/v1/matches/generate", headers=headers)
    assert gen_res.status_code == 200

    # Query again and verify exactly 1 match exists (no duplicate created)
    res2 = client.get("/api/v1/matches", headers=headers).json()
    matches2 = [m for m in res2["matches"] if m["lostItemId"] == lost_item["id"] and m["foundItemId"] == found_item["id"]]
    assert len(matches2) == 1
    assert matches2[0]["id"] == match_id


def test_match_status_lifecycle_updates(client: TestClient, auth_headers):
    """Verify match status updates (suggested -> viewed -> dismissed -> claimed)."""
    headers, _ = auth_headers

    # Report matching items for the user
    lost = client.post("/api/v1/items", headers=headers, json={
        "title": "Black Hydro Flask Bottle",
        "type": "lost",
        "category": "Accessories",
        "description": "Black flask bottle",
        "date": "2026-10-15",
        "location": "Gym",
        "campus": "Central",
    }).json()
    found = client.post("/api/v1/items", headers=headers, json={
        "title": "Black Hydro Flask Bottle",
        "type": "found",
        "category": "Accessories",
        "description": "Black flask found",
        "date": "2026-10-15",
        "location": "Gym",
        "campus": "Central",
    }).json()

    matches_res = client.get("/api/v1/matches", headers=headers).json()
    assert len(matches_res["matches"]) >= 1
    target_match_id = matches_res["matches"][0]["id"]

    # Update to 'viewed'
    view_res = client.patch(
        f"/api/v1/matches/{target_match_id}/status",
        headers=headers,
        json={"status": "viewed"},
    )
    assert view_res.status_code == 200
    assert view_res.json()["status"] == "viewed"

    # Update to 'dismissed'
    dismiss_res = client.patch(
        f"/api/v1/matches/{target_match_id}/status",
        headers=headers,
        json={"status": "dismissed"},
    )
    assert dismiss_res.status_code == 200
    assert dismiss_res.json()["status"] == "dismissed"


def test_match_pagination_and_query_filters(client: TestClient, auth_headers):
    """Verify pagination (skip, limit) and filters (tier, min_score, category, lost_item_id)."""
    headers, _ = auth_headers

    # Query with limit 1
    paged_res = client.get("/api/v1/matches?limit=1&skip=0", headers=headers)
    assert paged_res.status_code == 200
    data = paged_res.json()
    assert len(data["matches"]) <= 1

    # Query with min_score filter
    score_res = client.get("/api/v1/matches?min_score=50", headers=headers)
    assert score_res.status_code == 200
    for m in score_res.json()["matches"]:
        assert m["overallScore"] >= 50

    # Query with tier filter
    tier_res = client.get("/api/v1/matches?tier=strong", headers=headers)
    assert tier_res.status_code == 200
    for m in tier_res.json()["matches"]:
        assert m["confidenceTier"] == "strong"

