# FindIt — Frontend Startup Script (Windows PowerShell)
# Starts Vite development server on http://127.0.0.1:5173

$ErrorActionPreference = "Stop"

# Resolve directories safely relative to this script
$rootDir = $PSScriptRoot
if (-not $rootDir) {
    $rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$frontendDir = Join-Path $rootDir "frontend"

if (-not (Test-Path $frontendDir)) {
    # If already running from inside frontend/
    if (Test-Path (Join-Path $rootDir "package.json")) {
        $frontendDir = $rootDir
        $rootDir = Split-Path -Parent $rootDir
    } else {
        Write-Host "[ERROR] Frontend directory not found at $frontendDir" -ForegroundColor Red
        exit 1
    }
}

Set-Location $frontendDir

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  FindIt -- React + Vite Frontend Launcher" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "[1/4] Frontend Directory: $frontendDir" -ForegroundColor Gray

# 1. Check Node.js and npm availability
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not found in system PATH." -ForegroundColor Red
    Write-Host "Please install Node.js (v18+) from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npm is not found in system PATH." -ForegroundColor Red
    exit 1
}

# 2. Check package.json & dependencies
if (-not (Test-Path (Join-Path $frontendDir "package.json"))) {
    Write-Host "[ERROR] package.json not found in $frontendDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "[NOTICE] node_modules not found. Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed with exit code $LASTEXITCODE." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[2/4] Frontend dependencies: Verified (node_modules present)" -ForegroundColor Green
}

# 3. Check Port 5173 Availability & avoid duplicate servers
$portOccupied = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($portOccupied) {
    $owningPid = ($portOccupied | Select-Object -First 1).OwningProcess
    $proc = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
    $pName = if ($proc) { $proc.ProcessName } else { "Unknown" }

    # Test if existing server is already the responsive FindIt frontend
    $isResponding = $false
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:5173/" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            $isResponding = $true
        }
    } catch {}

    if ($isResponding) {
        Write-Host "[INFO] FindIt Frontend is already active on http://127.0.0.1:5173 (PID $owningPid, $pName)." -ForegroundColor Green
        Write-Host "  - Frontend URL:   http://127.0.0.1:5173/" -ForegroundColor White
        Write-Host "  - Backend Target: http://127.0.0.1:8000/api/v1" -ForegroundColor White
        Write-Host "No duplicate server needed. You can use the existing frontend." -ForegroundColor Cyan
        Write-Host "==================================================" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host "[ERROR] Port 5173 is occupied by PID $owningPid ($pName), but not responding as FindIt frontend." -ForegroundColor Red
        Write-Host "To free port 5173, stop that process:" -ForegroundColor Yellow
        Write-Host "  Stop-Process -Id $owningPid -Force" -ForegroundColor Yellow
        Write-Host "==================================================" -ForegroundColor Cyan
        exit 1
    }
} else {
    Write-Host "[3/4] Port 5173 is available." -ForegroundColor Green
}

# 4. Start Vite development server
Write-Host "[4/4] Starting Vite development server on http://127.0.0.1:5173 ..." -ForegroundColor Cyan
Write-Host "  - Frontend URL:   http://127.0.0.1:5173/" -ForegroundColor White
Write-Host "  - Backend Target: http://127.0.0.1:8000/api/v1" -ForegroundColor White
Write-Host "Press CTRL+C to stop the frontend." -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Cyan

npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
