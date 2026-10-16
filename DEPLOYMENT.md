# FindIt — Production Deployment Guide & Operations Manual

This guide details the complete production deployment procedure for **FindIt – Smart Lost & Found Platform**.

---

## 1. Production Architecture Overview

FindIt is deployed across four best-of-breed free-tier cloud platforms:

```
+---------------------------------------------------------------------------------+
|                                 PUBLIC INTERNET                                 |
+---------------------------------------------------------------------------------+
         | (HTTPS)                                             | (HTTPS)
         v                                                     v
+---------------------------------+                   +---------------------------+
|         VERCEL EDGE CDN         |                   |   CLOUDINARY IMAGE CDN    |
| - React 19 + Vite SPA           |                   | - Item Photographs        |
| - Zero Cold Starts              |                   | - WebP / Optimized CDN    |
| - Global Anycast Edge Network   |                   | - Persistent Object Store |
+---------------------------------+                   +---------------------------+
         | (REST API Calls)                                    ^
         v                                                     | (Direct Upload API)
+---------------------------------+                            |
|       RENDER WEB SERVICE        |----------------------------+
| - FastAPI REST Backend          |
| - Python 3.11 / Uvicorn         |
| - Dynamic $PORT Binding         |
| - HTTPS & Root Health Checks    |
+---------------------------------+
         | (TLS / Connection Pooler)
         v
+---------------------------------+
|     NEON CLOUD POSTGRESQL       |
| - Serverless PostgreSQL 16      |
| - Scale-to-Zero Compute         |
| - Permanent Free Tier           |
+---------------------------------+
```

### Verified Free Tier Quotas & Cost

| Service | Role | Cost | Plan & Limits |
| :--- | :--- | :--- | :--- |
| **Vercel** | Frontend Edge CDN | **$0.00** | Hobby Plan: 100 GB/mo bandwidth, unlimited deployments, SSL included, zero cold starts. |
| **Render** | Backend Web Service | **$0.00** | Free Tier: 512 MB RAM, 0.1 vCPU, 750 free instance hours/mo, SSL included. (Spins down after 15 min idle; cold start 30–50s). |
| **Neon** | PostgreSQL Database | **$0.00** | Free Tier: 0.5 GB SSD storage, 100 CU-hours/mo, permanent (does not expire after 30 days like Render DB), built-in connection pooler. |
| **Cloudinary** | Persistent Photos | **$0.00** | Free Plan: 25 monthly credits (~25,000 photos / 25 GB managed storage & bandwidth), global CDN delivery. |
| **TOTAL** | Full Stack Platform | **$0.00 / month** | 100% Free for portfolio & campus use. No credit card required. |

---

## 2. Step-by-Step Deployment Runbook

### Step 1: Provision Neon Cloud PostgreSQL Database

1. Sign up or log in to [Neon Console](https://console.neon.tech/) (free, no credit card required).
2. Click **Create Project**:
   - **Project Name:** `findit-db`
   - **Postgres Version:** 16 (default)
   - **Region:** Choose the region nearest to you (e.g. `US East (Ohio)` or `EU (Frankfurt)`).
3. Once created, navigate to **Dashboard** -> **Connection Details**:
   - Toggle **Connection pooling: ON** (this provides a pooled connection string with `-pooler` in the host).
   - Copy the connection string. It looks like:
     ```text
     postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - Keep this string private.

---

### Step 2: Migrate Existing SQLite Data to Neon PostgreSQL

Your existing SQLite database (`backend/data/findit.db`) contains 22 users, 17 items, 1 claim, 9 notifications, 72 matches, and 0 messages.

1. In PowerShell, execute the automated migration script with your Neon connection string:
   ```powershell
   cd c:\Users\KIIT\OneDrive\Documents\FindIt\backend
   .\.venv\Scripts\python.exe scripts\migrate_sqlite_to_postgres.py --postgres-url "YOUR_NEON_CONNECTION_STRING"
   ```
2. The script will:
   - Automatically create a timestamped backup of your SQLite file (`findit.db.backup_...`).
   - Connect to Neon and verify latency and SSL connection.
   - Provision all tables (`users`, `items`, `claims`, `matches`, `notifications`, `messages`).
   - Transfer all existing records while preserving IDs and foreign keys.
   - Validate and log final row counts.
3. Your local SQLite file remains completely intact as a fallback.

---

### Step 3: (Optional) Set up Cloudinary Persistent Image Storage

If you want uploaded photos to persist permanently across container rebuilds:

1. Sign up for a free account at [Cloudinary](https://cloudinary.com/).
2. On your Cloudinary Dashboard, note down:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. These will be added to Render's environment variables.
*(Note: If omitted, FindIt automatically falls back to local container storage).*

---

### Step 4: Deploy FastAPI Backend on Render

1. Sign up or log in to [Render](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `karan-rajput872/findit-smart-lost-and-found`.
4. Configure the Web Service settings:
   - **Name:** `findit-backend` (or your preferred name)
   - **Region:** Match your Neon region if possible (e.g. Oregon or Frankfurt)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install --no-cache-dir -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free ($0/month)
5. Under **Environment Variables**, add the following keys:
   - `ENVIRONMENT` = `production`
   - `PROJECT_NAME` = `FindIt API`
   - `VERSION` = `0.1.0`
   - `API_V1_STR` = `/api/v1`
   - `ENABLE_DOCS` = `true`
   - `JWT_SECRET_KEY` = *(Generate a 64-character random string; see command below)*
   - `DATABASE_URL` = *(Your Neon PostgreSQL connection string from Step 1)*
   - `BACKEND_CORS_ORIGINS` = `["https://YOUR-FRONTEND.vercel.app","http://localhost:5173"]` *(update with your actual Vercel URL once generated)*
   - `CLOUDINARY_CLOUD_NAME` = *(From Step 3, optional)*
   - `CLOUDINARY_API_KEY` = *(From Step 3, optional)*
   - `CLOUDINARY_API_SECRET` = *(From Step 3, optional)*
6. Click **Deploy Web Service**.
7. Once deployed, note your Render URL (e.g. `https://findit-backend.onrender.com`).
8. Verify backend health by visiting: `https://findit-backend.onrender.com/health`.

> **Tip to generate a JWT Secret Key:**
> ```powershell
> -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
> ```

---

### Step 5: Deploy React Frontend on Vercel

1. Sign up or log in to [Vercel](https://vercel.com/) with your GitHub account.
2. Click **Add New...** -> **Project**.
3. Select your repository: `findit-smart-lost-and-found`.
4. In the Project Configuration:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit and select `frontend`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
5. Expand **Environment Variables** and add:
   - `VITE_API_BASE_URL` = `https://YOUR-RENDER-BACKEND.onrender.com/api/v1`
   - `VITE_APP_NAME` = `FindIt`
   - `VITE_APP_TAGLINE` = `Don't lose hope. Find what matters.`
   - `VITE_DEMO_MODE` = `false`
6. Click **Deploy**.
7. Once deployed, Vercel gives you a public domain (e.g. `https://findit-frontend.vercel.app`).
8. **Final CORS handshake:** Go back to Render Dashboard -> `findit-backend` -> **Environment** -> Update `BACKEND_CORS_ORIGINS` with your exact Vercel URL:
   ```json
   ["https://findit-frontend.vercel.app"]
   ```
   Render will automatically trigger a fast zero-downtime redeploy.

---

## 3. Post-Deployment Verification Checklist

Once both services are live, verify the following:

- [ ] **HTTPS:** Both Vercel frontend and Render backend load with valid TLS certificates.
- [ ] **Health Endpoint:** `https://YOUR-BACKEND.onrender.com/health` returns:
  ```json
  {
    "status": "ok",
    "app_name": "FindIt API",
    "storage_mode": "postgresql",
    "database_status": "connected"
  }
  ```
- [ ] **API Documentation:** Interactive Swagger docs load at `https://YOUR-BACKEND.onrender.com/docs`.
- [ ] **Authentication:** Login with existing demo account (`alex.morgan@campus.edu` / `CampusPass123!`).
- [ ] **Registration:** Register a new student account. Verify token persistence.
- [ ] **Report Item:** Submit a new lost/found report with an image upload. Verify image displays correctly.
- [ ] **AI Matches:** Verify AI match pairs appear on `/dashboard/ai-matches`.
- [ ] **Claims & Contact Privacy:** Verify phone and WhatsApp numbers are hidden until mutual consent is granted on an approved claim.
- [ ] **Internal Messaging:** Send a message within an approved claim chat.
- [ ] **SPA Refresh:** Navigate to `/dashboard/browse` and refresh the browser. Verify page reloads without 404 error.

---

## 4. Rollback and Disaster Recovery Procedure

If any issue occurs during or after deployment:

1. **Database Recovery:**
   - A backup of your SQLite database was created at `backend/data/findit_backup_pre_deploy.db`.
   - To restore locally, simply copy the backup back:
     ```powershell
     Copy-Item backend\data\findit_backup_pre_deploy.db backend\data\findit.db -Force
     ```
2. **Backend Rollback:**
   - In Render Dashboard -> `findit-backend` -> **Events**, select the previous successful build and click **Rollback to this revision**.
3. **Frontend Rollback:**
   - In Vercel Dashboard -> **Deployments**, locate the previous working deployment and click **Promote to Production** (instantaneous edge switch).
