# FindIt — Backend Service Architecture & Setup (Milestone 2)

Welcome to the backend architecture for **FindIt — Smart Lost & Found Platform**.

Milestone 2 establishes the Python REST API foundation using **FastAPI**, **SQLAlchemy 2.x**, **Psycopg 3**, and **Alembic** migrations, engineered for future PostgreSQL and AI embedding capabilities.

---

## 1. Technology Stack

- **Web Framework:** [FastAPI](https://fastapi.tiangolo.com/) (0.115+)
- **ASGI Server:** [Uvicorn](https://www.uvicorn.org/) (0.30+)
- **ORM:** [SQLAlchemy 2.x](https://docs.sqlalchemy.org/en/20/) (Declarative 2.0 Mapping with `Mapped` and `mapped_column`)
- **Database Driver:** [Psycopg 3](https://www.psycopg.org/psycopg3/) (`psycopg[binary]`)
- **Configuration Management:** [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) (2.x)
- **Database Migrations:** [Alembic](https://alembic.sqlalchemy.org/)
- **Automated Testing:** [pytest](https://docs.pytest.org/) & `pytest-asyncio`

---

## 2. Directory Structure

```
backend/
│
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   └── health.py          # GET /api/v1/health (real DB connectivity verification)
│   │   ├── __init__.py
│   │   └── router.py              # Main API v1 routing hub
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py              # Pydantic Settings & environment variables
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py                # SQLAlchemy 2.0 DeclarativeBase
│   │   └── session.py             # Engine, SessionLocal, get_db dependency & check_db_connection
│   │
│   ├── models/                    # Initial Domain SQLAlchemy Models
│   │   ├── __init__.py            # Model registry for Alembic & metadata export
│   │   ├── user.py                # User model (id, full_name, email, campus, role)
│   │   ├── item.py                # Item model (LOST/FOUND, status, category, location)
│   │   ├── claim.py               # Claim model (private ownership verification answers)
│   │   └── notification.py        # Notification model (system alerts, matches)
│   │
│   ├── schemas/                   # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   └── health.py              # HealthResponse model
│   │
│   ├── services/                  # Future business logic services
│   │   └── __init__.py
│   │
│   ├── __init__.py
│   └── main.py                    # FastAPI application initialization & middleware
│
├── alembic/
│   ├── versions/
│   │   └── 20261011_01_initial_schema.py # Initial database migration
│   ├── env.py                     # Dynamic database URI from Settings + Base.metadata
│   └── script.py.mako             # Migration template
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py                # Pytest fixtures & TestClient setup
│   ├── test_root.py               # GET / root endpoint tests
│   ├── test_health.py             # GET /api/v1/health connected & offline tests
│   └── test_config.py             # Settings validation & CORS parsing tests
│
├── docker-compose.yml             # Optional local PostgreSQL service container
├── requirements.txt               # Pinned Python package dependencies
├── alembic.ini                    # Alembic migration configuration
├── pytest.ini                     # Isolated pytest test paths & filters
├── .env.example                   # Environment configuration template
└── README.md                      # Backend documentation
```

---

## 3. Database Models (Initial Schema)

In Milestone 2, the following core database tables are modeled using SQLAlchemy 2.0:

1. **`users`**:
   - `id`: Integer primary key, auto-incrementing.
   - `full_name`: String(100), community member name.
   - `email`: String(255), unique and indexed institutional email.
   - `campus`: String(100), campus/site affiliation.
   - `role`: String(20), `student`, `staff`, or `admin`.
   - `created_at`, `updated_at`: Timestamps with time zone.
   - *(Note: Authentication and password hashing are scheduled for Milestone 3).*

2. **`items`**:
   - `id`: Integer primary key, auto-incrementing.
   - `title`: String(150), indexed item headline.
   - `description`: Text, full item description.
   - `category`: String(50), indexed category (Electronics, Wallets, Keys, etc.).
   - `report_type`: Enum (`LOST` or `FOUND`).
   - `location`: String(200), facility or room location.
   - `campus`: String(100), institutional campus.
   - `item_date`: Date, incident date.
   - `image_url`: Optional String(500), photograph URI.
   - `status`: Enum (`OPEN`, `PENDING_VERIFICATION`, `CLAIMED`, `RESOLVED`).
   - `owner_id`: ForeignKey linking to `users.id` (`ondelete="CASCADE"`).
   - `created_at`, `updated_at`: Timestamps with time zone.

3. **`claims`**:
   - `id`: Integer primary key, auto-incrementing.
   - `item_id`: ForeignKey linking to `items.id`.
   - `claimant_id`: ForeignKey linking to `users.id`.
   - `description`: Text, **private ownership verification response** (strictly hidden from public item views).
   - `status`: Enum (`PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`).
   - `created_at`, `updated_at`: Timestamps with time zone.

4. **`notifications`**:
   - `id`: Integer primary key, auto-incrementing.
   - `user_id`: ForeignKey linking to `users.id`.
   - `title`: String(150), alert title.
   - `message`: Text, notification body.
   - `notification_type`: Enum (`MATCH_FOUND`, `CLAIM_SUBMITTED`, `CLAIM_STATUS`, `ITEM_RESOLVED`, `SYSTEM`).
   - `is_read`: Boolean, unread status flag.
   - `created_at`: Timestamp with time zone.

---

## 4. Windows PowerShell Setup & Local Environment

Follow these steps in **Windows PowerShell** to run the backend service.

### Step 1: Open PowerShell in the Backend Directory
```powershell
cd C:\Users\KIIT\OneDrive\Documents\FindIt\backend
```

### Step 2: Virtual Environment (.venv)
A virtual environment has been created at `backend/.venv` using Python 3.11.

#### Option A: Activate Virtual Environment (Recommended)
If PowerShell prevents script execution with an `ExecutionPolicy` error, bypass it for the current terminal session only (safe; does not change your system-wide security settings):
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```
*(When activated, your terminal prompt will show `(.venv)`).*

#### Option B: Run Directly Without Activation
You can also run any command directly using the virtual environment interpreter path:
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### Step 3: Install & Verify Dependencies
With the environment activated:
```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```
Or without activation:
```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Verify installed packages:
```powershell
python -m alembic --version
python -m uvicorn --version
```

---

## 5. Neon Cloud PostgreSQL Configuration

FindIt uses **Neon Cloud PostgreSQL** for serverless database hosting.

### Step 1: Configure `backend/.env`
Create a `.env` file inside the `backend/` folder (or copy from `.env.example`):
```powershell
Copy-Item .env.example .env
```

Open `backend/.env` in your editor and insert your Neon database connection URL:
```env
PROJECT_NAME="FindIt API"
ENVIRONMENT="development"
DEBUG=True
API_V1_STR="/api/v1"

# Neon Cloud PostgreSQL Connection URL:
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

BACKEND_CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]
```

> **Security Note:**
> - `backend/.env` is tracked in `.gitignore` and must **never** be committed to Git.
> - `backend/.env.example` contains safe placeholders only.
> - The application automatically normalizes Neon URLs (`postgresql://` or `postgres://` -> `postgresql+psycopg://`) and enforces `sslmode=require`.
> - Serverless connection pooling uses `pool_pre_ping=True` and `pool_recycle=300` to prevent dropouts during Neon cold starts.

---

## 6. Database Migrations (Alembic)

After configuring your real Neon `DATABASE_URL` in `backend/.env`, run the database migrations to create the tables in Neon:

```powershell
# With virtual environment activated:
python -m alembic upgrade head

# Without activation:
.\.venv\Scripts\python.exe -m alembic upgrade head
```

To inspect migration history:
```powershell
python -m alembic history
```

---

## 7. Running the FastAPI Application

Start the Uvicorn ASGI server with live reloading enabled:

```powershell
# With virtual environment activated:
python -m uvicorn app.main:app --reload --port 8000

# Without activation:
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

The server is available at:
- **API Root:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Health Check:** [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Health Check Response Behavior:
- **When Neon is reachable:**
  ```json
  {
    "status": "ok",
    "app_name": "FindIt API",
    "version": "0.1.0",
    "environment": "development",
    "database_status": "connected",
    "database_detail": "PostgreSQL connection pool verified via SELECT 1"
  }
  ```
- **When Neon is unavailable or before configuring `.env`:**
  The server still starts and responds with `database_status: "unavailable"` without crashing.

---

## 8. Running Automated Tests

Run the full pytest suite inside the virtual environment:

```powershell
# With virtual environment activated:
python -m pytest tests -v

# Without activation:
.\.venv\Scripts\python.exe -m pytest tests -v
```

All 9 unit and mock integration tests validate:
- Root metadata endpoint.
- Live and degraded states of `/api/v1/health`.
- URL normalization for Neon PostgreSQL schemes (`postgres://`, `postgresql://`).
- SSL parameter retention (`sslmode=require`).
- CORS origin parsing from JSON array or string.
- Isolation of unit tests from production database dependencies.

---

## 9. Running Full-Stack FindIt (Two Terminals)

To run the complete FindIt application simultaneously on Windows:

### Terminal 1: Backend (FastAPI)
```powershell
cd C:\Users\KIIT\OneDrive\Documents\FindIt\backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Frontend (React + Vite)
```powershell
cd C:\Users\KIIT\OneDrive\Documents\FindIt\frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. The frontend status indicator will connect to the FastAPI backend at [http://127.0.0.1:8000](http://127.0.0.1:8000).
