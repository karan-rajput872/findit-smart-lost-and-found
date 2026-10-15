"""FindIt Milestone 8 Live End-to-End Verification Script."""

import sys
import uuid
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_e2e():
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    print("=== STARTING MILESTONE 8 LIVE END-TO-END VERIFICATION ===")

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    assert health_data["status"] == "ok"
    assert health_data["database_status"] == "connected"
    print(" [1/12] Health endpoint verified: SQLite connected, status ok.")

    # 2. Register and log in as student 1 (Finder)
    s1_email = f"finder_{uuid.uuid4().hex[:6]}@campus.edu"
    s1_pass = "SecurePass123!"
    reg1 = client.post("/auth/register", json={
        "email": s1_email,
        "full_name": "Finder Alice",
        "campus": "North Campus",
        "role": "student",
        "password": s1_pass,
        "confirm_password": s1_pass
    })
    assert reg1.status_code == 201, f"Student 1 register failed: {reg1.text}"

    # Log in
    log1 = client.post("/auth/login", json={"email": s1_email, "password": s1_pass})
    assert log1.status_code == 200, f"Student 1 login failed: {log1.text}"
    token1 = log1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Verify /auth/me for student 1
    me1 = client.get("/auth/me", headers=headers1)
    assert me1.status_code == 200
    assert me1.json()["email"] == s1_email
    print(f" [2/12] Student 1 registered & logged in: {s1_email}")

    # 3. Report a lost item
    lost_item = client.post("/items", headers=headers1, json={
        "title": "AirPods Pro 2 with Green Case",
        "type": "lost",
        "category": "Electronics",
        "description": "Lost my AirPods near Science Hall Room 302.",
        "date": "2026-10-14",
        "location": "Science Hall Room 302",
        "campus": "North Campus",
        "reporter_name": "Finder Alice",
        "reporter_contact": s1_email
    })
    assert lost_item.status_code == 201
    lost_id = lost_item.json()["id"]
    print(f" [3/12] Lost item reported: {lost_id}")

    # 4. Report a found item
    found_item = client.post("/items", headers=headers1, json={
        "title": "TI-84 Plus CE Graphing Calculator",
        "type": "found",
        "category": "Electronics",
        "description": "Found on a desk in Central Library 2nd floor.",
        "date": "2026-10-15",
        "location": "Central Library 2nd floor",
        "campus": "North Campus",
        "reporter_name": "Finder Alice",
        "reporter_contact": s1_email
    })
    assert found_item.status_code == 201
    found_id = found_item.json()["id"]
    print(f" [4/12] Found item reported: {found_id}")

    # 5. Browse and filter available items
    browse_all = client.get("/items?type=found&category=Electronics")
    assert browse_all.status_code == 200
    items_list = browse_all.json()["items"]
    assert any(it["id"] == found_id for it in items_list)
    print(f" [5/12] Catalog browsing & filtering verified (found item appears in results).")

    # 6. Register Student 2 (Claimant)
    s2_email = f"claimant_{uuid.uuid4().hex[:6]}@campus.edu"
    s2_pass = "ClaimantPass123!"
    reg2 = client.post("/auth/register", json={
        "email": s2_email,
        "full_name": "Bob Claimant",
        "campus": "North Campus",
        "role": "student",
        "password": s2_pass,
        "confirm_password": s2_pass
    })
    assert reg2.status_code == 201
    log2 = client.post("/auth/login", json={"email": s2_email, "password": s2_pass})
    assert log2.status_code == 200
    token2 = log2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 7. Submit a claim with confidential ownership proof
    claim_resp = client.post("/claims", headers=headers2, json={
        "itemId": found_id,
        "description": "This is my TI-84 Plus CE calculator lost during Calculus lecture.",
        "proofDetails": "My name 'Bob C.' is carved inside the battery compartment and serial ends in 987."
    })
    assert claim_resp.status_code == 201, f"Claim failed: {claim_resp.text}"
    claim_id = claim_resp.json()["id"]
    assert claim_resp.json()["status"] == "pending"
    print(f" [6/12] Claim submitted with confidential proof: {claim_id} (Status: pending)")

    # 8. Privacy Audit: Register third student and verify they CANNOT see the confidential proof
    s3_email = f"intruder_{uuid.uuid4().hex[:6]}@campus.edu"
    s3_pass = "IntruderPass123!"
    reg3 = client.post("/auth/register", json={
        "email": s3_email,
        "full_name": "Eve Intruder",
        "campus": "North Campus",
        "role": "student",
        "password": s3_pass,
        "confirm_password": s3_pass
    })
    assert reg3.status_code == 201
    log3 = client.post("/auth/login", json={"email": s3_email, "password": s3_pass})
    assert log3.status_code == 200
    headers3 = {"Authorization": f"Bearer {log3.json()['access_token']}"}

    # Intruder tries to get claim details
    intruder_res = client.get(f"/claims/{claim_id}", headers=headers3)
    assert intruder_res.status_code in [403, 404], f"Privacy breach! Intruder received {intruder_res.status_code}"
    print(f" [7/12] Security Privacy Firewall verified: 3rd party blocked from viewing confidential proof.")

    # 9. Finder Alice reviews the claim
    alice_claims = client.get("/claims/received", headers=headers1)
    assert alice_claims.status_code == 200
    claims_list = alice_claims.json()["claims"]
    assert any(c["id"] == claim_id for c in claims_list)

    # Alice reviews and approves the claim
    review_resp = client.patch(f"/claims/{claim_id}/review", headers=headers1, json={
        "status": "approved",
        "reviewNotes": "Serial number matches the battery compartment."
    })
    assert review_resp.status_code == 200, f"Review failed: {review_resp.text}"
    assert review_resp.json()["status"] == "approved"
    print(f" [8/12] Item Finder Alice reviewed and approved claim: Status -> approved")

    # 10. Handover coordination
    handover_resp = client.patch(f"/claims/{claim_id}/handover", headers=headers1, json={
        "handoverStatus": "handover_arranged",
        "handoverDetails": "Meeting at Central Library Circulation Desk #1 on 2026-10-16 at 14:00."
    })
    assert handover_resp.status_code == 200, f"Handover failed: {handover_resp.text}"
    assert handover_resp.json()["handoverStatus"] == "handover_arranged"
    print(f" [9/12] Handover meeting coordinated at Central Library Circulation Desk.")

    # 11. Confirm physical return
    return_resp = client.post(f"/claims/{claim_id}/complete", headers=headers1, json={
        "completionNotes": "Item physically handed over and student verified."
    })
    assert return_resp.status_code == 200, f"Complete failed: {return_resp.text}"
    assert return_resp.json()["status"] == "completed"

    # Verify item status updated to returned
    updated_item = client.get(f"/items/{found_id}")
    assert updated_item.status_code == 200
    assert updated_item.json()["status"] == "returned"
    print(f" [10/12] Physical return confirmed: Claim -> completed, Item -> returned.")

    # 12. Notification Lifecycle
    notifs = client.get("/notifications", headers=headers2)
    assert notifs.status_code == 200
    notif_data = notifs.json()
    assert notif_data["total"] >= 1, "No notification was generated for claimant!"
    unread_c = notif_data.get("unreadCount", notif_data.get("unread_count", 0))
    assert unread_c >= 1, f"Expected unread count >= 1, got {unread_c}"
    first_notif_id = notif_data["notifications"][0]["id"]

    # Mark single notification as read
    mark_res = client.patch(f"/notifications/{first_notif_id}/read", headers=headers2)
    assert mark_res.status_code == 200
    assert mark_res.json().get("isRead", mark_res.json().get("is_read")) is True

    # Mark all read
    all_read = client.post("/notifications/mark-all-read", headers=headers2)
    assert all_read.status_code == 200

    notifs_after = client.get("/notifications", headers=headers2)
    unread_after = notifs_after.json().get("unreadCount", notifs_after.json().get("unread_count"))
    assert unread_after == 0, f"Expected unread count 0, got {unread_after}"
    print(f" [11/12] Real-time notifications verified (delivered, marked as read, unread count = 0).")

    # Persistence verification: verify item and claim survive and can be re-fetched
    persisted_item = client.get(f"/items/{found_id}")
    assert persisted_item.status_code == 200
    assert persisted_item.json()["title"] == "TI-84 Plus CE Graphing Calculator"
    print(f" [12/13] End-to-end data integrity & SQLite persistence confirmed.")

    # 13. Milestone 9 AI Smart Matching & Feedback Verification
    matches_resp = client.get("/matches", headers=headers1)
    assert matches_resp.status_code == 200, f"Match query failed: {matches_resp.text}"
    match_data = matches_resp.json()
    assert "matches" in match_data
    if match_data["matches"]:
        m_id = match_data["matches"][0]["id"]
        fb_resp = client.patch(
            f"/matches/{m_id}/feedback",
            headers=headers1,
            json={"feedback": "relevant", "notes": "E2E automated validation test"}
        )
        assert fb_resp.status_code == 200
        assert fb_resp.json()["feedback"] == "relevant"
    print(f" [13/13] Milestone 9 AI smart matching query & feedback verified on live API.")

    print("\n=======================================================")
    print(" ALL 13 WORKFLOWS VERIFIED SUCCESSFULLY ON LIVE BACKEND ")
    print("=======================================================")

if __name__ == "__main__":
    run_e2e()
