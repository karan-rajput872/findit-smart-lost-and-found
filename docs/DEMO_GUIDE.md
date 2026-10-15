# FindIt — Demonstration Guide & Presentation Script

> **Target Audience:** Portfolio reviewers, campus administrators, technical interviewers, and conference attendees.  
> **Estimated Demo Duration:** 3 to 5 minutes  
> **Platform Version:** FindIt v0.1.0 (Milestone 10 Production Ready)

---

## 1. Demo Credentials & Test Scenarios

The local development environment (`ENVIRONMENT=development`) automatically pre-seeds isolated, synthetic demo accounts into `backend/data/findit.db`. No real student PII is ever used.

| Persona | Role | Email | Password | Primary Purpose |
|---|---|---|---|---|
| **Alex Morgan** | Student | `alex.morgan@campus.edu` | `CampusPass123!` | Reports lost belongings, reviews incoming claims, conducts handover. |
| **Elena Rostova** | Student | `elena.r@campus.edu` | `ElenaPass123!` | Reports found items, discovers AI matches, files ownership claims. |
| **Marcus Vance** | Library Staff | `library-help@campus.edu` | `StaffPass123!` | Manages campus library lost-and-found desk. |
| **Sarah Jenkins** | Security Admin | `security@campus.edu` | `StaffPass123!` | Administrative oversight and platform health monitoring. |

---

## 2. 5-Minute Live Demonstration Script

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⏱️ 0:00 - 0:45 │ Scene 1: The Problem & FindIt Value Proposition            │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⏱️ 0:45 - 1:30 │ Scene 2: Dual Reporting (Lost & Found Listings)            │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⏱️ 1:30 - 2:30 │ Scene 3: AI-Powered Smart Matching Engine                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⏱️ 2:30 - 3:30 │ Scene 4: Confidential Ownership Verification & Claims      │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⏱️ 3:30 - 4:15 │ Scene 5: Physical Handover & Atomic Return Confirmation    │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⏱️ 4:15 - 5:00 │ Scene 6: In-App Notifications & Admin Oversight            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Scene 1: The Problem & Value Proposition (0:00 - 0:45)
* **Visual:** Open landing page at `http://127.0.0.1:5173`.
* **Speaker Script:**
  > *"Every semester across college campuses, thousands of laptops, student IDs, and personal belongings are misplaced. Historically, recovery depends on chaotic group chats, handwritten library logs, or public social media posts that invite fraudulent claims. FindIt solves this with a campus-first platform combining confidential ownership verification, an automated multi-attribute AI matching engine, and atomic physical return tracking."*

### Scene 2: Reporting Lost & Found Belongings (0:45 - 1:30)
* **Action:**
  1. Log in as **Elena** (`elena.r@campus.edu` / `ElenaPass123!`).
  2. Navigate to **Report Item** -> Choose **"I Found Something"**.
  3. Report:
     - **Title:** "Silver MacBook Air M2 with stickers"
     - **Category:** Electronics
     - **Location:** Main Library, 2nd Floor Quiet Zone
     - **Date:** Today's date
  4. Submit and show the new listing in **Browse Catalog** (`/dashboard/browse`).
* **Speaker Script:**
  > *"Elena finds a laptop at the library desk. She submits a structured report with building and timestamp metadata. Notice that sensitive identifiers like serial numbers are intentionally kept off the public page."*

### Scene 3: AI-Powered Smart Matching Engine (1:30 - 2:30)
* **Action:**
  1. Log out or switch to an incognito window and log in as **Alex** (`alex.morgan@campus.edu` / `CampusPass123!`).
  2. Navigate to **AI Matches** (`/dashboard/ai-matches`).
  3. Point out the high-confidence match ($88\%$) pairing Alex's previously reported lost MacBook with Elena's found listing.
  4. Expand the **Match Explanation Card**:
     - Semantic similarity score ($40\%$ weight).
     - Category alignment ($25\%$ weight).
     - Campus location proximity ($20\%$ weight).
     - Date delta decay ($15\%$ weight).
  5. Demonstrate the **Feedback Actions**: Click "Relevant" and show the persisted tag.
* **Speaker Script:**
  > *"Here is FindIt's AI matching engine in action. Instead of relying solely on exact keyword searches, it uses a multi-attribute hybrid scoring pipeline combining local semantic embeddings, category hierarchy, campus building proximity, and temporal decay. The recommendation is 100% explainable, and user feedback helps refine future recommendations."*

### Scene 4: Confidential Ownership Claims & Privacy Firewall (2:30 - 3:30)
* **Action:**
  1. From the matched item, Alex clicks **"Claim This Item"**.
  2. In the modal, Alex submits:
     - **Explanation:** *"This is my laptop left at the library study cubicle."*
     - **Private Ownership Proof:** *"The laptop has an octocat sticker on the lid and a lock screen wallpaper of Mount Fuji."*
  3. Submit claim -> Status is `Pending Review`.
  4. Switch back to Elena's session -> Open **Received Claims** (`/dashboard/received-claims`).
  5. Highlight the **Confidential Proof Section**: Elena can see Alex's private wallpaper details because she is the finder, but a third-party student inspecting the catalog cannot see it.
* **Speaker Script:**
  > *"To prevent false claims, FindIt enforces a strict Privacy Firewall. Claimants must provide private verification details—such as wallpapers or engravings—that only the finder or verified staff can review. Unauthorized users receive a 403 Forbidden error if they attempt to view private claim details."*

### Scene 5: Physical Handover & Atomic Return Confirmation (3:30 - 4:15)
* **Action:**
  1. Elena clicks **"Approve Claim"** with notes: *"Stickers and lock screen match perfectly."*
  2. Elena clicks **"Coordinate Handover"** -> Selects *"Handover Arranged"* with location: *"Meet at Library Front Circulation Desk at 3:00 PM."*
  3. After physical handover, Elena clicks **"Confirm Item Returned"**.
  4. Verify:
     - Claim status updates to `Completed`.
     - Handover status updates to `Returned Successfully`.
     - The item listing in the catalog is locked and marked `Returned`.
* **Speaker Script:**
  > *"Once the claim is approved, the parties coordinate a secure campus handover point. When Elena confirms physical return, FindIt atomically completes the claim and locks the item listing in a single database transaction, ensuring the item cannot be claimed again."*

### Scene 6: In-App Notifications & Admin Oversight (4:15 - 5:00)
* **Action:**
  1. Show the header notification bell with real-time unread badges.
  2. Open the **Notifications Feed** (`/dashboard/notifications`) showing alerts across every lifecycle event.
  3. Log in as **Sarah Jenkins** (`security@campus.edu` / `StaffPass123!`) and navigate to the **Admin Dashboard** (`/dashboard/admin`).
  4. Highlight global platform metrics: total items, resolution rates, open claims, and AI match performance.
* **Speaker Script:**
  > *"Both users receive real-time, isolated alerts across every stage of the recovery. Finally, campus administrators have global visibility over facility resolution rates, active claims, and security logs through the Admin Dashboard."*

---

## 3. How to Reset Demonstration Data

To return the local database to its pristine pre-seeded initial state:

```powershell
# Stop running services
# Delete local SQLite database
Remove-Item backend\data\findit.db -Force

# Run migrations to recreate tables
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head

# Start application (auto-seeds clean demo data on initial boot)
cd ..
.\start-findit.ps1
```
