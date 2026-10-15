# FindIt — System Architecture & Technical Specifications

> **Architecture Style:** Decoupled Client-Server SPA Architecture  
> **Backend Framework:** FastAPI (Python 3.11+, ASGI / Uvicorn)  
> **Frontend Framework:** React 19 + TypeScript + Vite  
> **ORM & Database:** SQLAlchemy 2.0 with Alembic Migrations  
> **Storage Support:** SQLite (Local Development) & PostgreSQL (Production / Cloud)

---

## 1. High-Level System Architecture

The following diagram illustrates the complete end-to-end data flow between the React SPA client, FastAPI API gateway, domain repositories, security services, and persistent databases.

```mermaid
graph TD
    Client["React 19 + TypeScript Frontend<br/>(Vite SPA, Tailwind CSS)"]
    
    subgraph FastAPI_Backend ["FastAPI Application (Port 8000)"]
        Router["API Router (/api/v1)"]
        AuthMiddleware["JWT Authentication & Security"]
        
        subgraph Services ["Repository & Domain Logic"]
            AuthService["Auth & User Repository"]
            ItemService["SqlAlchemyItemRepository"]
            ClaimService["SqlAlchemyClaimRepository"]
            NotifService["SqlAlchemyNotificationRepository"]
        end
        
        DBEngine["SQLAlchemy 2.0 Engine & Session"]
    end
    
    subgraph Storage ["Persistent Storage Layer"]
        SQLiteDB[("SQLite Database<br/>backend/data/findit.db<br/>(Local Development)")]
        PostgresDB[("PostgreSQL Database<br/>Neon Cloud / Docker<br/>(Production Ready)")]
    end

    Client -->|"HTTP / REST / JSON<br/>Authorization: Bearer &lt;JWT&gt;"| Router
    Router --> AuthMiddleware
    AuthMiddleware --> AuthService
    Router --> ItemService
    Router --> ClaimService
    Router --> NotifService
    ClaimService -->|"Trigger Alert"| NotifService
    
    AuthService --> DBEngine
    ItemService --> DBEngine
    ClaimService --> DBEngine
    NotifService --> DBEngine
    
    DBEngine -.->|"Default Mode"| SQLiteDB
    DBEngine -.->|"When DATABASE_URL set"| PostgresDB
```

---

## 2. Authentication & Authorization Architecture

Authentication is stateless and uses standard JSON Web Tokens (JWT) signed with HMAC-SHA256.

```mermaid
sequenceDiagram
    autonumber
    actor User as Student / Staff
    participant Frontend as React SPA (Vite)
    participant AuthAPI as FastAPI /auth/login
    participant DB as SQLite / PostgreSQL

    User->>Frontend: Enter campus email & password
    Frontend->>AuthAPI: POST /api/v1/auth/login {email, password}
    AuthAPI->>DB: Query user by email
    DB-->>AuthAPI: User record (Bcrypt hash)
    AuthAPI->>AuthAPI: Verify password with bcrypt.checkpw()
    AuthAPI->>AuthAPI: Generate signed JWT (sub: userId, exp: 24h)
    AuthAPI-->>Frontend: 200 OK {access_token, token_type: bearer, user}
    Frontend->>Frontend: Store token in memory / localStorage
    
    Note over Frontend,AuthAPI: Subsequent Protected Requests
    Frontend->>AuthAPI: GET /api/v1/auth/me (Header: Bearer <token>)
    AuthAPI->>AuthAPI: Validate signature & expiration
    AuthAPI-->>Frontend: 200 OK (Current User Profile)
```

---

## 3. Claim Lifecycle & Item Return State Machine

Ownership verification is protected by a strict finite state machine on the backend that prevents invalid transitions, duplicate claims, and claimant self-approvals.

```mermaid
stateDiagram-v2
    [*] --> Pending: Claimant submits claim with private proof
    
    Pending --> UnderReview: Reporter reviews & requests info
    Pending --> Approved: Reporter verifies ownership proof
    Pending --> Rejected: Reporter rejects invalid claim
    Pending --> Cancelled: Claimant withdraws claim
    
    UnderReview --> Approved: Reporter approves verified proof
    UnderReview --> Rejected: Reporter rejects claim
    UnderReview --> Cancelled: Claimant withdraws claim
    
    Approved --> Completed: Physical handover confirmed<br/>(Item atomically marked 'returned')
    
    Rejected --> [*]
    Cancelled --> [*]
    Completed --> [*]
```

### Transition Authorization Matrix

| Action | Source Status | Target Status | Authorized Roles | Side Effects |
|---|---|---|---|---|
| **Submit Claim** | — | `pending` | Authenticated Non-Owner | Notifies Reporter and Claimant |
| **Review Claim** | `pending` | `under_review` | Item Reporter, Admin | Notifies Claimant with review notes |
| **Approve Claim**| `pending`, `under_review` | `approved` | Item Reporter, Admin | Sets `handover_status = awaiting_handover`; notifies Claimant |
| **Reject Claim** | `pending`, `under_review` | `rejected` | Item Reporter, Admin | Notifies Claimant with rejection reason; Item remains available |
| **Cancel Claim** | `pending`, `under_review` | `cancelled` | Claimant, Admin | Notifies Reporter; Item remains available |
| **Update Handover**| `approved` | `approved` | Reporter, Claimant, Admin | Updates handover details & meeting instructions; alerts counterpart |
| **Complete Return**| `approved` | `completed` | Item Reporter, Admin | Sets `handover_status = returned_successfully`; atomically sets `item.status = returned` |

---

## 4. In-App Notification Dispatch System

Every event in the claim and return lifecycle automatically persists an isolated notification for the relevant party:

```mermaid
flowchart TD
    E1[Claim Submitted] -->|Notify Reporter| N1[New Claim Received Alert]
    E1 -->|Notify Claimant| N2[Claim Submission Confirmed Alert]
    
    E2[Claim Under Review] -->|Notify Claimant| N3[Claim Under Review Alert]
    
    E3[Claim Approved] -->|Notify Claimant| N4[Claim Approved! Coordination Open Alert]
    
    E4[Claim Rejected] -->|Notify Claimant| N5[Claim Rejected with Notes Alert]
    
    E5[Handover Updated] -->|Notify Counterpart| N6[Meeting Instructions Updated Alert]
    
    E6[Return Completed] -->|Notify Claimant| N7[Item Returned Successfully! Alert]
    
    E7[High Confidence Match Found] -->|Notify Reporter| N8[Smart AI Match Recommendation Alert]
```

---

## 5. AI-Powered Smart Matching Engine Architecture

The FindIt matching engine pairs newly submitted and existing lost and found reports using a multi-attribute hybrid scoring model.

```mermaid
flowchart TD
    ReportLost[Lost Item Report] --> Engine[Matching Engine Service]
    ReportFound[Found Item Report] --> Engine
    
    subgraph ScoringPipeline ["Hybrid Weighted Scoring Pipeline"]
        direction TB
        S1["Semantic Similarity (40%)<br/>LocalEmbeddingModel (all-MiniLM-L6-v2 / TF-IDF)"]
        S2["Category Match (25%)<br/>Exact & Related Hierarchy"]
        S3["Location Proximity (20%)<br/>Campus Building & Zone Match"]
        S4["Temporal Proximity (15%)<br/>Exponential / Gaussian Decay"]
    end
    
    Engine --> ScoringPipeline
    ScoringPipeline --> Aggregate["Aggregate Confidence Score<br/>Score = S1*0.4 + S2*0.25 + S3*0.20 + S4*0.15"]
    
    Aggregate --> Threshold{"Score >= Threshold<br/>(Default: 0.35)"}
    Threshold -->|No| Discard[Do not generate record]
    Threshold -->|Yes| PersistMatch["Upsert Match Record<br/>(lost_item_id, found_item_id, score, explanation)"]
    PersistMatch --> Notify["Trigger Notification to Lost Item Reporter (Score >= 0.70)"]
    PersistMatch --> Dashboard["Display in User & Admin AI Matches Feed"]
```

### Hybrid Scoring Formulation
The overall match confidence $C \in [0.0, 1.0]$ is computed as:
$$C = 0.40 \times S_{\text{semantic}} + 0.25 \times S_{\text{category}} + 0.20 \times S_{\text{location}} + 0.15 \times S_{\text{temporal}}$$

- **Semantic Text Similarity ($S_{\text{semantic}}$):** Concatenates title and description, runs embeddings through `LocalEmbeddingModel` with cosine similarity, or falls back to pure-Python TF-IDF with synonym clustering.
- **Category Match ($S_{\text{category}}$):** Yields $1.0$ for exact string match; $0.5$ for compatible super-categories (e.g., electronics vs accessories).
- **Location Proximity ($S_{\text{location}}$):** Yields $1.0$ for exact building matches; partial credit for campus zone overlap.
- **Temporal Proximity ($S_{\text{temporal}}$):** Evaluates $|date_{lost} - date_{found}|$. A 0-day difference yields $1.0$, decaying smoothly over days.

