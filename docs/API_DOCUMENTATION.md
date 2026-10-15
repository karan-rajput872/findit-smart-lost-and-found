# FindIt — REST API Specification

> **Base URL:** `http://127.0.0.1:8000/api/v1`  
> **Interactive Swagger UI:** `http://127.0.0.1:8000/docs`  
> **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`  
> **Format:** JSON (UTF-8)

---

## 1. Authentication Endpoints

### 1.1 Register New Account
- **Endpoint:** `POST /api/v1/auth/register`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "student@campus.edu",
    "password": "SecurePassword123!",
    "confirmPassword": "SecurePassword123!",
    "fullName": "Alex Morgan",
    "campus": "North Campus"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "usr_94b15c7219d0",
    "email": "student@campus.edu",
    "fullName": "Alex Morgan",
    "role": "student",
    "campus": "North Campus",
    "createdAt": "2026-10-14T12:00:00Z"
  }
  ```

### 1.2 User Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "student@campus.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "user": {
      "id": "usr_94b15c7219d0",
      "email": "student@campus.edu",
      "fullName": "Alex Morgan",
      "role": "student"
    }
  }
  ```

### 1.3 Get Authenticated Profile
- **Endpoint:** `GET /api/v1/auth/me`
- **Auth Required:** Yes (`Bearer <token>`)
- **Response (200 OK):**
  ```json
  {
    "id": "usr_94b15c7219d0",
    "email": "student@campus.edu",
    "fullName": "Alex Morgan",
    "role": "student",
    "campus": "North Campus"
  }
  ```

### 1.4 Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Auth Required:** Optional
- **Response (200 OK):** `{"message": "Logged out successfully"}`

---

## 2. Lost & Found Items Endpoints

### 2.1 List & Filter Items
- **Endpoint:** `GET /api/v1/items`
- **Parameters:**
  - `type` (optional): `lost` | `found`
  - `category` (optional): `Electronics`, `Bags and Accessories`, etc.
  - `campus` (optional): `North Campus`, `South Campus`, etc.
  - `status` (optional): `open`, `in_claim`, `resolved`, `returned`
  - `q` (optional): Search query string
  - `skip` (optional, default 0), `limit` (optional, default 50)
- **Response (200 OK):**
  ```json
  {
    "items": [...],
    "total": 42,
    "skip": 0,
    "limit": 50
  }
  ```

### 2.2 Create New Item Listing
- **Endpoint:** `POST /api/v1/items`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Body:**
  ```json
  {
    "title": "Black Leather Wallet with Student ID",
    "description": "Found near the campus cafeteria cashier.",
    "category": "Bags and Accessories",
    "type": "found",
    "location": "Student Dining Center",
    "campus": "North Campus",
    "date": "2026-10-14",
    "imageUrl": "https://images.unsplash.com/photo-..."
  }
  ```
- **Response (201 Created):** Created Item object.

### 2.3 Get Item Details
- **Endpoint:** `GET /api/v1/items/{item_id}`
- **Response (200 OK):** Full Item object.

### 2.4 Update Item Listing
- **Endpoint:** `PATCH /api/v1/items/{item_id}` (or `PUT`)
- **Auth Required:** Yes (Original Reporter or Admin; returns `403 Forbidden` otherwise)
- **Request Body:** Partial or full Item fields to update.

### 2.5 Delete Item Listing
- **Endpoint:** `DELETE /api/v1/items/{item_id}`
- **Auth Required:** Yes (Original Reporter or Admin)
- **Response (204 No Content)**

### 2.6 User Listings & Platform Statistics
- **Endpoint:** `GET /api/v1/items/my-listings`: Returns current user's reported items.
- **Endpoint:** `GET /api/v1/items/stats`: Returns live platform metrics (total items, open items, lost count, found count, user count).

---

## 3. Claim Management & Return Endpoints

### 3.1 Submit Ownership Claim
- **Endpoint:** `POST /api/v1/claims`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Body:**
  ```json
  {
    "itemId": "item_101",
    "description": "This is my Hydro Flask bottle. I left it on table 4.",
    "proofDetails": "Has a NASA sticker on the front and initials 'AM' engraved on the base."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "clm_4a71b2d091e4",
    "itemId": "item_101",
    "itemTitle": "Hydro Flask Water Bottle",
    "claimantId": "usr_94b15c7219d0",
    "status": "pending",
    "proofDetails": "Has a NASA sticker...",
    "createdAt": "2026-10-14T12:30:00Z"
  }
  ```

### 3.2 List Submitted Claims
- **Endpoint:** `GET /api/v1/claims/my-claims`
- **Auth Required:** Yes
- **Query Params:** `status` (optional), `skip`, `limit`
- **Response (200 OK):** `{"claims": [...], "total": 2}`

### 3.3 List Received Claims
- **Endpoint:** `GET /api/v1/claims/received`
- **Auth Required:** Yes (Returns claims targeting items reported by current user)
- **Query Params:** `status` (optional), `skip`, `limit`

### 3.4 Get Claim Details
- **Endpoint:** `GET /api/v1/claims/{claim_id}`
- **Auth Required:** Yes (Participants or Admin only; `proofDetails` masked for third parties)

### 3.5 Review Claim (Approve / Reject / Under Review)
- **Endpoint:** `PATCH /api/v1/claims/{claim_id}/review`
- **Auth Required:** Yes (Item Reporter or Admin only)
- **Request Body:**
  ```json
  {
    "status": "approved",
    "reviewNotes": "Proof verified. Sticker details match perfectly."
  }
  ```

### 3.6 Coordinate Handover Arrangements
- **Endpoint:** `PATCH /api/v1/claims/{claim_id}/handover`
- **Auth Required:** Yes (Reporter, Claimant, or Admin)
- **Request Body:**
  ```json
  {
    "handoverStatus": "handover_arranged",
    "handoverDetails": "Meet at Main Library Circulation Desk at 3:00 PM tomorrow."
  }
  ```

### 3.7 Complete Physical Return
- **Endpoint:** `POST /api/v1/claims/{claim_id}/complete`
- **Auth Required:** Yes (Item Reporter or Admin)
- **Request Body (optional):**
  ```json
  {
    "completionNotes": "Physical return completed. Student ID verified."
  }
  ```
- **Response (200 OK):** Claim marked `completed`, handover `returned_successfully`, item status atomically set to `returned`.

### 3.8 Cancel Claim
- **Endpoint:** `POST /api/v1/claims/{claim_id}/cancel`
- **Auth Required:** Yes (Claimant only)

---

## 4. Notifications Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/notifications` | Paginated user alerts (`skip`, `limit`) |
| `GET` | `/api/v1/notifications/unread-count` | Quick count of unread notifications |
| `PATCH` | `/api/v1/notifications/{id}/read` | Mark single notification as read |
| `POST` | `/api/v1/notifications/mark-all-read` | Mark all user notifications as read |
| `DELETE` | `/api/v1/notifications/{id}` | Delete single notification |

---

---

## 5. AI Smart Matching Endpoints

### 5.1 List Smart Matches
- **Endpoint:** `GET /api/v1/matches`
- **Auth Required:** Yes (`Bearer <token>`)
- **Query Parameters:**
  - `min_score` (optional, float): Minimum confidence threshold (e.g. `0.35`)
  - `status` (optional, string): Filter by status (`suggested`, `reviewed`, `accepted`, `rejected`)
  - `user_feedback` (optional, string): Filter by feedback (`relevant`, `not_relevant`, `already_recovered`, `duplicate`)
  - `is_dismissed` (optional, boolean): Filter dismissed matches
  - `lost_item_id` (optional, string): Filter matches for a specific lost item
  - `found_item_id` (optional, string): Filter matches for a specific found item
  - `skip` (optional, int, default 0), `limit` (optional, int, default 20)
- **Response (200 OK):**
  ```json
  {
    "matches": [
      {
        "id": "match_e7f10b2d",
        "lostItemId": "item_101",
        "foundItemId": "item_202",
        "confidenceScore": 0.88,
        "categoryScore": 1.0,
        "locationScore": 0.85,
        "dateScore": 0.90,
        "semanticScore": 0.82,
        "explanation": "High similarity in category (Electronics), location (Main Library), and description keywords.",
        "status": "suggested",
        "userFeedback": null,
        "feedbackRemarks": null,
        "isDismissed": false,
        "createdAt": "2026-10-15T10:00:00Z",
        "lostItem": { "id": "item_101", "title": "MacBook Air M2", "location": "Library 2nd Floor" },
        "foundItem": { "id": "item_202", "title": "Silver Apple Laptop", "location": "Main Library Desk" }
      }
    ],
    "total": 1,
    "skip": 0,
    "limit": 20
  }
  ```

### 5.2 Get Match Details
- **Endpoint:** `GET /api/v1/matches/{match_id}`
- **Auth Required:** Yes
- **Response (200 OK):** Match detail object with item relationships.

### 5.3 Generate Matches On-Demand
- **Endpoint:** `POST /api/v1/matches/generate`
- **Auth Required:** Yes
- **Query Parameters:** `threshold` (optional float, default 0.35)
- **Response (200 OK):**
  ```json
  {
    "generatedCount": 4,
    "message": "AI matching evaluation complete. 4 new potential matches identified."
  }
  ```

### 5.4 Submit Match Feedback
- **Endpoint:** `PATCH /api/v1/matches/{match_id}/feedback`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "feedback": "relevant",
    "remarks": "Matches the exact stickers on my laptop."
  }
  ```
- **Response (200 OK):** Updated match object.

### 5.5 Update Match Status & Dismissal
- **Endpoint:** `PATCH /api/v1/matches/{match_id}/status`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "status": "reviewed",
    "isDismissed": false
  }
  ```
- **Response (200 OK):** Updated match object.

---

## 6. Diagnostic & Health Endpoints

- `GET /health` and `GET /api/v1/health`:
  ```json
  {
    "status": "ok",
    "app_name": "FindIt API",
    "version": "0.1.0",
    "environment": "development",
    "storage_mode": "sqlite",
    "database_status": "connected",
    "database_detail": "connected"
  }
  ```
- `GET /`: API metadata and documentation links.

