# FindIt — Backend Startup Script (Windows PowerShell)
# Starts FastAPI server on http://127.0.0.1:8000 using backend/.venv

$ErrorActionPreference = "Stop"

# Resolve directories safely relative to this script
$rootDir = $PSScriptRoot
if (-not $rootDir) {
    $rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$backendDir = Join-Path $rootDir "backend"

if (-not (Test-Path $backendDir)) {
    # If already running from inside backend/
    if (Test-Path (Join-Path $rootDir "app\main.py")) {
        $backendDir = $rootDir
    } else {
        Write-Host "[ERROR] Backend directory not found at $backendDir" -ForegroundColor Red
        exit 1
    }
}

Set-Location $backendDir

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  FindIt -- FastAPI Backend Launcher" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "[1/4] Working Directory: $backendDir" -ForegroundColor Gray

# 1. Check Virtual Environment
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "[ERROR] Virtual environment not found at: $venvPython" -ForegroundColor Red
    Write-Host "Please create the virtual environment first:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Yellow
    Write-Host "  python -m venv .venv" -ForegroundColor Yellow
    Write-Host "  .\.venv\Scripts\python.exe -m pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

Write-Host "[2/4] Python Interpreter: Found ($venvPython)" -ForegroundColor Green

# 2. Dependency availability check
$depCheck = & $venvPython -c "import fastapi, uvicorn; print('OK')" 2>$null
if ($depCheck -ne "OK") {
    Write-Host "[ERROR] FastAPI or Uvicorn not installed in virtual environment." -ForegroundColor Red
    Write-Host "Please install dependencies:" -ForegroundColor Yellow
    Write-Host "  & `"$venvPython`" -m pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# 3. Check Port 8000 Availability & avoid duplicate servers
$portOccupied = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($portOccupied) {
    $owningPid = ($portOccupied | Select-Object -First 1).OwningProcess
    $proc = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
    $pName = if ($proc) { $proc.ProcessName } else { "Unknown" }

    # Test if existing server is already the healthy FindIt backend
    $isHealthy = $false
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2 -ErrorAction Stop
        if ($resp.status -eq "ok" -or $resp.app_name -eq "FindIt API") {
            $isHealthy = $true
        }
    } catch {}

    if ($isHealthy) {
        Write-Host "[INFO] FindIt Backend is already active and healthy on http://127.0.0.1:8000 (PID $owningPid, $pName)." -ForegroundColor Green
        Write-Host "  - API Base:     http://127.0.0.1:8000/" -ForegroundColor White
        Write-Host "  - Health Check: http://127.0.0.1:8000/health" -ForegroundColor White
        Write-Host "  - Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
        Write-Host "No duplicate server needed. You can use the existing backend." -ForegroundColor Cyan
        Write-Host "==================================================" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host "[ERROR] Port 8000 is occupied by PID $owningPid ($pName), but not responding as FindIt backend." -ForegroundColor Red
        Write-Host "To free port 8000, stop that process:" -ForegroundColor Yellow
        Write-Host "  Stop-Process -Id $owningPid -Force" -ForegroundColor Yellow
        Write-Host "==================================================" -ForegroundColor Cyan
        exit 1
    }
} else {
    Write-Host "[3/4] Port 8000 is available." -ForegroundColor Green
}

# 4. Environment check
$envPath = Join-Path $backendDir ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "[INFO] backend/.env not found. Using default persistent SQLite database (backend/data/findit.db)." -ForegroundColor Green
} else {
    Write-Host "[INFO] Loaded environment configuration from backend/.env" -ForegroundColor Green
}

# 5. Start Uvicorn
Write-Host "[4/4] Starting Uvicorn server on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Write-Host "  - API Base:     http://127.0.0.1:8000/" -ForegroundColor White
Write-Host "  - Health Check: http://127.0.0.1:8000/health" -ForegroundColor White
Write-Host "  - Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "Press CTRL+C to stop the backend." -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Cyan

& $venvPython -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
