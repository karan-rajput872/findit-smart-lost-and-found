# FindIt — Local Setup & Installation Guide

> **System Prerequisites:**  
> - Python 3.11+  
> - Node.js 18+ (LTS recommended) & npm  
> - Windows PowerShell 5.1+ or PowerShell Core (macOS/Linux bash also supported)  
> - No external database server required (uses local persistent SQLite by default)

---

## 1. Quick Start (Recommended — One Command)

From the project root directory (`C:\Users\KIIT\OneDrive\Documents\FindIt`):

```powershell
.\start-findit.ps1
```

This single launcher script automatically:
1. Validates the backend Python virtual environment and dependencies.
2. Checks port availability (`8000` and `5173`) and avoids duplicate servers if already healthy.
3. Launches Backend and Frontend in separate PowerShell processes.
4. Outputs the exact local URLs:
   - **Frontend SPA:** `http://127.0.0.1:5173`
   - **Backend API:** `http://127.0.0.1:8000`
   - **API Docs (Swagger):** `http://127.0.0.1:8000/docs`
   - **Health Diagnostic:** `http://127.0.0.1:8000/health`

---

## 2. Manual Step-by-Step Installation

If you prefer starting each service independently in separate terminals:

### Step A: Backend Setup (FastAPI)

1. Open PowerShell and navigate to the `backend/` directory:
   ```powershell
   cd backend
   ```

2. Create a virtual environment (if not already created):
   ```powershell
   python -m venv .venv
   ```

3. Activate the virtual environment & install dependencies:
   ```powershell
   .\.venv\Scripts\python.exe -m pip install --upgrade pip
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```

4. Apply database migrations:
   ```powershell
   .\.venv\Scripts\python.exe -m alembic upgrade head
   ```

5. Launch the FastAPI server:
   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

### Step B: Frontend Setup (React + Vite)

1. Open a second PowerShell terminal and navigate to the `frontend/` directory:
   ```powershell
   cd frontend
   ```

2. Install Node dependencies:
   ```powershell
   npm install
   ```

3. Launch the Vite development server:
   ```powershell
   npm run dev -- --host 127.0.0.1 --port 5173
   ```

4. Open your browser to `http://127.0.0.1:5173`.

---

## 3. Database Configuration

### Mode 1: SQLite (Default Local Development)
- **Zero setup required.** If `DATABASE_URL` is omitted, FindIt automatically creates and uses `backend/data/findit.db`.
- Database tables are automatically initialized and seeded with campus test records on initial boot.
- Data is fully persistent across server restarts and machine reboots.

### Mode 2: PostgreSQL (Neon Cloud or Local Docker)
To point FindIt to a PostgreSQL database:
1. In `backend/.env`, set:
   ```dotenv
   DATABASE_URL="postgresql+psycopg://<USER>:<PASSWORD>@<HOST>:<PORT>/<DBNAME>?sslmode=require"
   ```
2. Run migrations against PostgreSQL:
   ```powershell
   cd backend
   .\.venv\Scripts\python.exe -m alembic upgrade head
   ```
3. Restart the backend server. The healthcheck (`/health`) will report `storage_mode: "postgresql"` and `database_status: "connected"`.

---

## 4. Default Seeded Demo Accounts

On fresh setup, the following test accounts are pre-seeded in the database:

| Account | Email | Password | Role |
|---|---|---|---|
| **Primary Student** | `alex.morgan@campus.edu` | `CampusPass123!` | student |
| **Secondary Student** | `elena.r@campus.edu` | `ElenaPass123!` | student |
| **Library Helpdesk** | `library-help@campus.edu` | `StaffPass123!` | staff |
| **Campus Security** | `security@campus.edu` | `StaffPass123!` | staff |

*(You can also freely register new student accounts directly from the `/register` web interface).*

---

## 5. Troubleshooting & FAQ

### Port 8000 or 5173 Already in Use
The startup scripts automatically detect whether the server on the port is already healthy. If a stale process has hung:
```powershell
# Find and stop the process on port 8000
Get-NetTCPConnection -LocalPort 8000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
# Find and stop the process on port 5173
Get-NetTCPConnection -LocalPort 5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Execution Policy Error
If PowerShell blocks running scripts:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
*(Or invoke via `powershell -ExecutionPolicy Bypass -File .\start-findit.ps1`).*
