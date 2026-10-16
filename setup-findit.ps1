# FindIt -- Environment Setup & Dependency Verification Script (Windows PowerShell)
# Resolves project root, backend directory, and manages backend/.venv reliably.

[CmdletBinding()]
param(
    [switch]$ForceReinstall = $false
)

$ErrorActionPreference = "Stop"

# 1. Resolve project root reliably from script location
$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$rootDir = (Resolve-Path $scriptDir).Path

# Handle case where script was invoked from a subdirectory
if (Test-Path (Join-Path $rootDir "backend\app\main.py")) {
    $projectRoot = $rootDir
} elseif (Test-Path (Join-Path $rootDir "..\backend\app\main.py")) {
    $projectRoot = (Resolve-Path (Join-Path $rootDir "..")).Path
} else {
    $projectRoot = $rootDir
}

$backendDir = Join-Path $projectRoot "backend"
$reqFile = Join-Path $backendDir "requirements.txt"
$preferredVenv = Join-Path $backendDir ".venv"
$venvPython = Join-Path $preferredVenv "Scripts\python.exe"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  FindIt -- Environment Setup & Diagnostics" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Project Root : $projectRoot" -ForegroundColor Gray
Write-Host "Backend Dir  : $backendDir" -ForegroundColor Gray
Write-Host ""

# 2. Locate or create virtual environment
if (-not (Test-Path $venvPython)) {
    Write-Host "[1/3] Virtual environment not found at $preferredVenv." -ForegroundColor Yellow
    Write-Host "      Detecting host Python interpreter to bootstrap virtual environment..." -ForegroundColor Gray

    $hostPython = $null
    $candidates = @("python", "py", "python3", "C:\Python311\python.exe", "C:\Program Files\Python311\python.exe")
    foreach ($cand in $candidates) {
        try {
            $testVer = & $cand --version 2>$null
            if ($LASTEXITCODE -eq 0 -and $testVer -match "Python 3\.") {
                $hostPython = $cand
                break
            }
        } catch {}
    }

    if (-not $hostPython) {
        Write-Host "[ERROR] Could not find a functional host Python 3 interpreter on PATH." -ForegroundColor Red
        Write-Host "Please install Python 3.11+ from https://www.python.org/downloads/ and ensure it is added to PATH." -ForegroundColor Red
        exit 1
    }

    Write-Host "      Creating virtual environment using '$hostPython'..." -ForegroundColor Cyan
    & $hostPython -m venv $preferredVenv
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $venvPython)) {
        Write-Host "[ERROR] Failed to create virtual environment at $preferredVenv." -ForegroundColor Red
        exit 1
    }
    Write-Host "      Virtual environment created successfully." -ForegroundColor Green
    $needsInstall = $true
} else {
    Write-Host "[1/3] Virtual Environment Found: $preferredVenv" -ForegroundColor Green
    $needsInstall = $ForceReinstall
}

# 3. Detect Python Version
$pyVerCmd = "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"
$pyVerOutput = & $venvPython -c $pyVerCmd 2>$null
Write-Host "      Python Executable: $venvPython" -ForegroundColor White
Write-Host "      Python Version   : $pyVerOutput" -ForegroundColor White

# 4. Check & Install Required Dependencies
Write-Host "`n[2/3] Checking Required Dependencies..." -ForegroundColor Cyan

$pyCheckDeps = @'
missing = []
for pkg in ['fastapi', 'sqlalchemy', 'psycopg', 'alembic', 'pytest']:
    try:
        __import__(pkg)
    except ImportError:
        missing.append(pkg)
print(','.join(missing))
'@

$missingPackages = & $venvPython -c $pyCheckDeps 2>$null

if ($missingPackages -and $missingPackages.Trim().Length -gt 0) {
    Write-Host "      Missing required package(s): $missingPackages" -ForegroundColor Yellow
    $needsInstall = $true
} else {
    Write-Host "      All core packages (fastapi, sqlalchemy, psycopg, alembic, pytest) are present." -ForegroundColor Green
}

if ($needsInstall) {
    Write-Host "`n[3/3] Installing/updating packages from backend/requirements.txt..." -ForegroundColor Cyan
    if (-not (Test-Path $reqFile)) {
        Write-Host "[ERROR] requirements.txt not found at $reqFile." -ForegroundColor Red
        exit 1
    }

    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r $reqFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install requirements." -ForegroundColor Red
        exit 1
    }
    Write-Host "      Dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "[3/3] Dependencies up-to-date. (Skipped pip install)" -ForegroundColor Green
}

# Final Verification
Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "  Environment Verification Summary" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$pySummary = @'
import fastapi, sqlalchemy, psycopg, alembic, pytest
print(f'  - FastAPI    : {fastapi.__version__}')
print(f'  - SQLAlchemy : {sqlalchemy.__version__}')
print(f'  - psycopg 3  : {psycopg.__version__}')
print(f'  - Alembic    : {alembic.__version__}')
print(f'  - pytest     : {pytest.__version__}')
'@

$summary = & $venvPython -c $pySummary
Write-Host $summary -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Environment is ready! You can now run:" -ForegroundColor Green
Write-Host "  .\verify-neon.ps1" -ForegroundColor Yellow
Write-Host "  .\start-findit.ps1" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
exit 0
