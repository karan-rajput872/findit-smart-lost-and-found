# FindIt — Smart Campus Lost & Found Platform

> **Platform Tagline:** *"Don't lose hope. Find what matters."*  
> **Status:** **Milestone 10 Completed — Production Ready & Portfolio Launch**  
> **Verification:** **83 Automated Pytest Tests Passing (0 Failures)** | **0 TypeScript Compilation Errors** | **Dual-Database: SQLite & PostgreSQL 16 Compatible**

---

## 1. Project Name & Description

**FindIt** is a modern, privacy-first, full-stack lost-and-found web platform specifically designed for college and university campuses. Engineered with a high-performance **FastAPI (Python)** backend and a responsive **React 19 (TypeScript)** single-page application, FindIt bridges the gap between campus students, staff, and facilities by transforming fragmented paper logs into an intelligent, automated, and confidential recovery workflow.

---

## 2. Problem Statement

University campuses function as micro-cities where thousands of valuable belongings—laptops, smartphones, campus IDs, wallets, keys, and water bottles—are misplaced every semester. Historically, recovery operations face severe bottlenecks:
- **Disjoint Physical Silos:** Department front desks, libraries, dining halls, and campus security maintain separate, uncatalogued boxes or paper logbooks.
- **Unstructured Digital Channels:** Social media groups and campus forums leak sensitive belongings, invite theft, and suffer from high noise.
- **Privacy & Fraud Vulnerabilities:** Publicly posting identifiable details or images allows fraudulent claimants to claim items that do not belong to them.
- **Lack of Accountability:** No systematic record tracks who verified ownership, where items are stored, or when physical handover occurred.

---

## 3. Key Features

- **🔐 User Authentication & Role Authorization:** Secure self-service registration and login with salted Bcrypt password hashing and stateless PyJWT bearer tokens (Student, Staff, and Admin roles).
- **📋 Lost & Found Item Catalog:** Complete reporting workflow for both lost and found belongings, including multi-attribute filtering (category, campus, status, date) and keyword search.
- **🛡️ Confidential Ownership Claims:** Claimants submit detailed ownership proof that is protected by a strict privacy firewall—accessible only by the item reporter and administrators.
- **🤝 Physical Handover Coordination:** Structured coordination workflow allowing parties to agree on physical meeting points (e.g. Library Circulation Desk) with notes and timing.
- **⚡ Atomic Handover Confirmation:** Completing a return atomically transitions the claim to `completed` and the item to `returned` within a single database transaction, locking the item against further claims.
- **🤖 AI-Powered Smart Matching Engine:** Automated pairing of lost and found listings using hybrid multi-attribute scoring (semantic text similarity via local embeddings, category matching, campus location proximity, and temporal decay).
- **💡 Transparent Match Explanations & Feedback:** Human-readable explanations for recommendations, transparent score breakdowns, and user feedback actions (`relevant`, `not_relevant`, `already_recovered`, `duplicate`).
- **🔔 Real-Time In-App Notifications:** Automated, user-isolated notification feed alerting members to claim submissions, reviews, handover updates, and high-confidence AI matches.
- **📊 Admin Dashboard:** Global oversight of all platform reports, claims, matches, and system health metrics.

---

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend SPA** | React 19, TypeScript, Vite, Vanilla CSS custom design system, Lucide React icons, React Router v7 |
| **Backend API** | Python 3.11+, FastAPI (ASGI), Uvicorn, Pydantic v2, Pydantic Settings |
| **Security** | PyJWT (stateless Bearer authentication), Passlib / Bcrypt password hashing |
| **ORM & Database** | SQLAlchemy 2.0, Alembic schema migrations |
| **Databases Supported** | SQLite (zero-config local persistence), PostgreSQL 16 (`psycopg` 3 driver, SSL support) |
| **AI / Machine Learning** | Local embedding pipeline (`sentence-transformers` / `all-MiniLM-L6-v2` with zero-dependency pure-Python TF-IDF cosine similarity fallback) |
| **DevOps & Containers** | Docker, Docker Compose, Nginx reverse proxy |
| **Testing** | Pytest, HTTPX, FastAPI TestClient (83 tests) |

---

## 5. Application Architecture

FindIt uses a decoupled client-server architecture with clear domain separation between data access, business services, and presentation:

```mermaid
graph TD
    Client["React 19 + TypeScript SPA<br/>(Vite, Custom Design System)"]
    
    subgraph FastAPI_Backend ["FastAPI Application (Port 8000)"]
        Router["API Router (/api/v1)"]
        AuthMiddleware["JWT Authentication & Security Guards"]
        
        subgraph DomainServices ["Domain Services & Repositories"]
            AuthService["Auth & User Repository"]
            ItemService["SqlAlchemyItemRepository"]
            ClaimService["SqlAlchemyClaimRepository"]
            MatchService["MatchingEngine & MatchRepository"]
            NotifService["SqlAlchemyNotificationRepository"]
        end
        
        DBEngine["SQLAlchemy 2.0 Engine & Session"]
    end
    
    subgraph Storage ["Persistent Storage Layer"]
        SQLiteDB[("SQLite Database<br/>backend/data/findit.db<br/>(Local Dev)")]
        PostgresDB[("PostgreSQL 16 DB<br/>Neon Cloud / Docker<br/>(Production Ready)")]
    end

    Client -->|"REST API / JSON<br/>Authorization: Bearer &lt;JWT&gt;"| Router
    Router --> AuthMiddleware
    AuthMiddleware --> AuthService
    Router --> ItemService
    Router --> ClaimService
    Router --> MatchService
    Router --> NotifService
    ClaimService -->|"Trigger Alerts"| NotifService
    MatchService -->|"High-Score Alerts"| NotifService
    
    AuthService --> DBEngine
    ItemService --> DBEngine
    ClaimService --> DBEngine
    MatchService --> DBEngine
    NotifService --> DBEngine
    
    DBEngine -.->|"Default Mode"| SQLiteDB
    DBEngine -.->|"When DATABASE_URL set"| PostgresDB
```

---

## 6. Screenshots & Visual Walkthrough

Recommended demonstration screenshots to capture from the live application:

| Screenshot | Description | Suggested Route |
|---|---|---|
| **01_Landing_Hero.png** | Homepage hero section, quick search bar, and platform mission tagline. | `/` |
| **02_Browse_Catalog.png** | Search & multi-parameter filter grid with item cards, status badges, and categories. | `/dashboard/browse` |
| **03_Item_Details_Claim.png** | Item view showing location, date, and confidential ownership claim dialog. | `/dashboard/items/:id` |
| **04_Confidential_Review.png** | Received claim view displaying private claimant proof protected for reviewer. | `/dashboard/received-claims` |
| **05_Handover_Coordinator.png** | Handover tracking modal showing meeting instructions and return confirmation. | `/dashboard/received-claims` |
| **06_AI_Matches_Feed.png** | AI recommendations with multi-attribute confidence score, explanations, and feedback. | `/dashboard/ai-matches` |
| **07_Notifications_Center.png** | Notification bell dropdown and full notifications page with unread indicators. | `/dashboard/notifications` |
| **08_Admin_Overview.png** | System metrics, user counts, item distribution, and platform health. | `/dashboard/admin` |

---

## 7. Installation Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+ (LTS) & npm
- Git
- Windows PowerShell 5.1+ (or bash on Linux/macOS)

### Clone the Repository
```bash
git clone https://github.com/your-username/findit.git
cd findit
```

---

## 8. Environment Setup

Create local environment files from the provided templates:

### Backend Configuration (`backend/.env`)
```bash
cp .env.example backend/.env
```
Key configuration options:
- `ENVIRONMENT`: Set to `development` locally (enables pre-seeded demo accounts) or `production`.
- `JWT_SECRET_KEY`: Random 64-character hex string.
- `DATABASE_URL`: Leave blank for automatic SQLite local database, or set PostgreSQL connection string.
- `BACKEND_CORS_ORIGINS`: Permitted frontend origins (default: `http://localhost:5173,http://127.0.0.1:5173`).

### Frontend Configuration (`frontend/.env`)
```bash
# Optional: defaults to http://127.0.0.1:8000/api/v1 if not specified
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

---

## 9. Local Execution Instructions

### Quick Start (Recommended — One Command)
Run the root PowerShell launcher to boot both services simultaneously:
```powershell
.\start-findit.ps1
```

### Manual Service Startup
If running in separate terminal windows:

**Terminal 1 — Backend:**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

- **Frontend App:** [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Diagnostic:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 10. API Documentation

Interactive API documentation is automatically generated by FastAPI:
- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Detailed Reference:** Consult [`docs/API_DOCUMENTATION.md`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/API_DOCUMENTATION.md) for full request/response schemas.

---

## 11. AI Matching Explanation

FindIt pairs lost reports with found reports using a multi-attribute hybrid scoring model:

$$C_{\text{match}} = 0.40 \times S_{\text{semantic}} + 0.25 \times S_{\text{category}} + 0.20 \times S_{\text{location}} + 0.15 \times S_{\text{date}}$$

- **Semantic Text Similarity ($40\%$):** Uses `LocalEmbeddingModel` targeting `all-MiniLM-L6-v2`. If PyTorch/SentenceTransformers are absent in low-resource environments, the engine gracefully falls back to a pure-Python TF-IDF vectorizer with synonym clustering.
- **Category Similarity ($25\%$):** Exact category matches receive $1.0$; compatible super-categories receive partial credit.
- **Location Proximity ($20\%$):** Exact building matching with campus zone awareness.
- **Temporal Proximity ($15\%$):** Gaussian decay based on date difference $|date_{\text{lost}} - date_{\text{found}}|$.
- **Feedback & Privacy:** Users can flag recommendations as `relevant`, `not_relevant`, `already_recovered`, or `duplicate`. Confidential claim verification data is never ingested into AI matching routines.

---

## 12. Database Configuration

FindIt features a dual-database design:
1. **SQLite (Local Development):** Default mode. Zero external setup. Stored in `backend/data/findit.db`. Automatically seeded on first startup.
2. **PostgreSQL 16 (Production):** Connect to Neon Cloud, AWS RDS, or Docker PostgreSQL by setting `DATABASE_URL` in `backend/.env`:
   ```env
   DATABASE_URL="postgresql+psycopg://user:password@host:5432/dbname?sslmode=require"
   ```
   Alembic migration history is managed via `backend/alembic/versions/` (`20261011_01` → `20261014_01` → `20261014_02` → `20261015_01`).

---

## 13. Testing Instructions

### Run Automated Backend Tests (Pytest)
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```
**Status: 83 tests passing (0 failures)** across authentication, items, claims, notifications, persistence, and AI matching.

### Run Frontend Production Build & Type-Check
```powershell
cd frontend
npm run build
```
**Status: 0 errors**, production bundle compiled to `frontend/dist/`.

For complete QA guidelines and manual testing scenarios, see [`docs/TESTING_GUIDE.md`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/TESTING_GUIDE.md).

---

## 14. Deployment Instructions

FindIt is deployment-ready for containerized environments:

### Multi-Container Docker Compose
```bash
docker compose up -d --build
```
This builds and launches:
- **`backend`**: FastAPI ASGI with 4 Uvicorn workers
- **`frontend`**: React SPA served via production Nginx reverse proxy
- **`db`**: PostgreSQL 16 Alpine with health check and persistent volumes

For complete VPS setup, PaaS evaluation (Render, Railway, Fly.io, Neon), and database backup/restore instructions, consult [`docs/DEPLOYMENT_GUIDE.md`](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/DEPLOYMENT_GUIDE.md).

---

## 15. Future Improvements

1. **Native Mobile App:** Build cross-platform React Native client for iOS and Android with push notifications.
2. **Computer Vision Matching:** Extend the local matching pipeline to compute image feature embeddings (e.g. MobileNet / CLIP) for visual item comparison.
3. **QR Code Handover Badges:** Generate one-time cryptographic QR codes for claimants to present at campus desks for instant physical scan verification.
4. **Campus SSO / OAuth2 Integration:** Direct integration with university Identity Providers (SAML / Shibboleth / Google Workspace).
5. **Interactive Campus Map:** Leaflet/Mapbox integration visualizing lost/found item hotspots across campus facilities.

---

## Pre-Seeded Demo Accounts (Development Only)

> [!NOTE]
> Demo accounts are automatically seeded only in development mode (`ENVIRONMENT=development`) to facilitate immediate testing and evaluation.

| Role | Email | Password | Campus |
|---|---|---|---|
| **Student** | `alex.morgan@campus.edu` | `CampusPass123!` | North Campus |
| **Student** | `elena.r@campus.edu` | `ElenaPass123!` | South Campus |
| **Library Staff** | `library-help@campus.edu` | `StaffPass123!` | Main Campus |
| **Security Staff** | `security@campus.edu` | `StaffPass123!` | Main Campus |

---

## Documentation Index

- [PROJECT_OVERVIEW.md](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/PROJECT_OVERVIEW.md) — Problem statement, campus requirements, and presentation outline.
- [SYSTEM_ARCHITECTURE.md](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/SYSTEM_ARCHITECTURE.md) — Architecture diagrams, state machines, and AI matching pipeline.
- [DATABASE_DESIGN.md](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/DATABASE_DESIGN.md) — ERD diagrams, table schemas, indexes, and migrations.
- [API_DOCUMENTATION.md](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/API_DOCUMENTATION.md) — REST API endpoint reference and payloads.
- [SETUP_GUIDE.md](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/SETUP_GUIDE.md) — Developer setup instructions and troubleshooting.
- [TESTING_GUIDE.md](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/TESTING_GUIDE.md) — Automated test suite breakdown and manual test plans.
- [DEPLOYMENT_GUIDE.md](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/DEPLOYMENT_GUIDE.md) — Production Docker, VPS, cloud PaaS, backup and restore procedures.
- [DEMO_GUIDE.md](file:///c:/Users/KIIT/OneDrive/Documents/FindIt/docs/DEMO_GUIDE.md) — 5-minute live demonstration script, test scenarios, and data reset guide.

---

## Author & Maintainer

**Priyanshu Karan**  
- B.Tech in Computer Science & Engineering, Kalinga Institute of Industrial Technology (KIIT), Bhubaneswar, Odisha, India  
- GitHub: [@karan-rajput872](https://github.com/karan-rajput872)  
- LinkedIn: [priyanshu-karan](https://www.linkedin.com/in/priyanshu-karan-417202390/)  
- Email: `priyanshukaran25@gmail.com`

