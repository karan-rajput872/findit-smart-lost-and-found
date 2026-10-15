# FindIt — Full Stack Launcher (Windows PowerShell)
# Launches Backend (FastAPI on http://127.0.0.1:8000) and Frontend (Vite on http://127.0.0.1:5173) in separate PowerShell windows

$ErrorActionPreference = "Stop"

# Resolve project root directory reliably
$rootDir = $PSScriptRoot
if (-not $rootDir) {
    $rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
# If executed from inside backend or frontend subdirectory
if ((Test-Path (Join-Path $rootDir "..\backend")) -and (Test-Path (Join-Path $rootDir "..\frontend"))) {
    $rootDir = (Resolve-Path (Join-Path $rootDir "..")).Path
}

Set-Location $rootDir

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  FindIt -- Smart Lost & Found Platform Launcher" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Project Root: $rootDir" -ForegroundColor Gray
Write-Host ""

$backendScript = Join-Path $rootDir "start-backend.ps1"
$frontendScript = Join-Path $rootDir "start-frontend.ps1"

if (-not (Test-Path $backendScript)) {
    Write-Host "[ERROR] Could not locate start-backend.ps1 at $backendScript" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $frontendScript)) {
    Write-Host "[ERROR] Could not locate start-frontend.ps1 at $frontendScript" -ForegroundColor Red
    exit 1
}

# 1. Check if Backend is already active
$backendRunning = $false
try {
    $healthResp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2 -ErrorAction Stop
    if ($healthResp.status -eq "ok" -or $healthResp.app_name -eq "FindIt API") {
        $backendRunning = $true
    }
} catch {}

if ($backendRunning) {
    Write-Host "[INFO] Backend is already running and healthy at http://127.0.0.1:8000 (skipping duplicate launch)." -ForegroundColor Green
} else {
    Write-Host "[LAUNCH] Starting Backend in a separate PowerShell window..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$backendScript`""
    Start-Sleep -Seconds 2
}

# 2. Check if Frontend is already active
$frontendRunning = $false
try {
    $feResp = Invoke-WebRequest -Uri "http://127.0.0.1:5173/" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    if ($feResp.StatusCode -eq 200) {
        $frontendRunning = $true
    }
} catch {}

if ($frontendRunning) {
    Write-Host "[INFO] Frontend is already running and active at http://127.0.0.1:5173 (skipping duplicate launch)." -ForegroundColor Green
} else {
    Write-Host "[LAUNCH] Starting Frontend in a separate PowerShell window..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$frontendScript`""
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  FindIt Local Services Status & URLs" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  1. React Frontend:       http://127.0.0.1:5173" -ForegroundColor Yellow
Write-Host "  2. FastAPI Backend:      http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "  3. Backend Health Check: http://127.0.0.1:8000/health" -ForegroundColor Yellow
Write-Host "  4. Interactive API Docs: http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "All terminal windows run with -NoExit to prevent silent closing on error." -ForegroundColor White
Write-Host "Keep both terminal windows open while testing in Google Chrome." -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
