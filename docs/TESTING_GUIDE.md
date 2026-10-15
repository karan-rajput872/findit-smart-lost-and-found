# FindIt — Quality Assurance & Testing Guide

> **Test Frameworks:** Pytest (`pytest`, `httpx`, `FastAPI TestClient`) + TypeScript Compiler (`tsc`)  
> **Total Automated Backend Tests:** 83 Tests Passing (0 Failures)  
> **Frontend Build Status:** 0 TypeScript Errors, Production Bundle Generated

---

## 1. Running the Automated Backend Test Suite

To run all automated backend tests:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```

To run with brief output or coverage:
```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

To run a specific test suite:
```powershell
# Run only AI smart matching tests
.\.venv\Scripts\python.exe -m pytest -v tests/test_matching.py

# Run only claim management tests
.\.venv\Scripts\python.exe -m pytest -v tests/test_claims.py

# Run only notification tests
.\.venv\Scripts\python.exe -m pytest -v tests/test_notifications.py

# Run only database persistence tests
.\.venv\Scripts\python.exe -m pytest -v tests/test_persistence.py
```

### 1.1 Running Live End-to-End System Tests
To test the complete user journey against an active, live FastAPI server instance:
```powershell
# Ensure backend is running, then in backend/:
.\.venv\Scripts\python.exe tests/run_live_e2e.py

# Test AI matching live verification:
.\.venv\Scripts\python.exe verify_live_matches.py
```
This tests real HTTP requests across:
1. Health and database connectivity.
2. Multi-user registration & JWT login.
3. Reporting lost & found items.
4. Catalog search & filtering.
5. Confidential ownership claim submission.
6. Privacy firewall (403 Forbidden for third parties).
7. Reporter claim review & approval.
8. Physical handover coordination.
9. Atomic return completion & item status locking.
10. In-app notification delivery, marking read, and unread counters.
11. AI smart match recommendation generation, confidence scoring, and feedback loop.
12. Data persistence verification.

---

## 2. Test Suite Breakdown

| Test Module | Tests | Focus Area |
|---|---|---|
| [`test_auth.py`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/backend/tests/test_auth.py) | 14 | Registration validation, weak password rejection, duplicate email handling, login success/failure, bcrypt hashing, JWT issuance and expiration, user data isolation. |
| [`test_items.py`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/backend/tests/test_items.py) | 22 | Lost & found item creation, pagination, multi-filter search, owner editing, owner deletion, non-owner 403 Forbidden enforcement, unauthenticated rejection. |
| [`test_claims.py`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/backend/tests/test_claims.py) | 11 | Claim submission, own-item rejection, duplicate active claim prevention, confidential proof privacy masking, reporter approval/rejection, cancellation, handover coordination, atomic return confirmation, returned item lock. |
| [`test_matching.py`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/backend/tests/test_matching.py) | 13 | Smart matching algorithm, multi-attribute scoring (category, location, date, semantic), confidence threshold filtering, on-demand match generation, user feedback actions, match status transitions, dismissal, and high-confidence alert notifications. |
| [`test_notifications.py`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/backend/tests/test_notifications.py) | 4 | Automatic notification generation across claim lifecycle, recipient isolation, unread counter query, marking single read, marking all read, notification deletion security. |
| [`test_persistence.py`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/backend/tests/test_persistence.py) | 5 | Multi-session persistence in SQLite file, restart survival across engine disconnections, ownership verification across sessions. |
| [`test_milestone5_integration.py`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/backend/tests/test_milestone5_integration.py) | 5 | End-to-end full-stack user journeys across multiple accounts. |
| [`test_config.py`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/backend/tests/test_config.py) | 5 | Environment settings, CORS comma/array parsing, Neon/PostgreSQL URI normalization (`postgresql+psycopg`). |
| [`test_health.py`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/backend/tests/test_health.py) | 3 | `/health` diagnostic endpoints, live database connectivity test. |
| [`test_root.py`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/backend/tests/test_root.py) | 2 | Root metadata endpoint, CORS preflight headers. |

---

## 3. Frontend Type-Checking & Production Build Verification

To verify that the React TypeScript application builds cleanly without compile-time errors:

```powershell
cd frontend
npm run build
```

The build executes `tsc -b && vite build`.
- **Expected result:** Exit code `0`, 0 errors, production output generated in `frontend/dist/`.

---

## 4. Manual End-to-End Verification Scenario

For comprehensive manual integration testing across two distinct users:

### Step 1: User A Reports a Found Belonging
1. Open browser at `http://127.0.0.1:5173`.
2. Login as `alex.morgan@campus.edu` / `CampusPass123!`.
3. Click **Report Item** -> Choose **I Found Something**.
4. Fill in:
   - Title: "Navy Blue Jansport Backpack"
   - Category: "Bags and Accessories"
   - Location: "Library 2nd Floor Study Cubicle"
   - Campus: "North Campus"
5. Submit the report. Verify the item appears in `/dashboard/browse` and `/dashboard/my-reports`.

### Step 2: User B Submits an Ownership Claim
1. Open an Incognito window or logout.
2. Login as `elena.r@campus.edu` / `ElenaPass123!`.
3. Browse to the "Navy Blue Jansport Backpack" in the directory.
4. Click **Claim This Item**.
5. Fill in:
   - Explanation: "I left my navy Jansport bag while studying for chemistry yesterday."
   - Private Proof: "Inside the small front pocket is a set of silver house keys with an avocado keychain."
6. Submit the claim. Verify the item shows an active claim banner, and navigate to **My Claims** (`/dashboard/my-claims`) to verify status is `Pending Review`.

### Step 3: User A Reviews & Approves Claim
1. Switch back to User A's session.
2. Notice the notification bell badge increments to `1 Unread`.
3. Open the notification dropdown -> Click the alert -> Redirects to **Received Claims** (`/dashboard/received-claims`).
4. Click **Review Claim**.
5. Notice that User A can see Elena's confidential proof details.
6. Select **Approve Claim** and enter notes: "Proof verified! Avocado keychain matches."
7. Submit the decision. Claim status moves to `Approved`.

### Step 4: Handover Coordination & Return Confirmation
1. User A clicks **Coordinate Handover**.
2. Selects status `Handover Arranged` and enters details: "Meet at Main Library Circulation Desk at 2 PM."
3. User B receives a notification: "Handover Details Updated" with meeting instructions.
4. After physical meeting, User A clicks **Confirm Item Returned**.
5. Enter completion notes: "Item handed over to Elena, student ID verified."
6. Confirm return.
7. Verify:
   - Claim status becomes `Completed`.
   - Handover status becomes `Returned Successfully`.
   - Associated backpack listing in Browse is marked `Returned` and can no longer be claimed.
   - User B receives final alert: "Item Returned Successfully! 🎊".
