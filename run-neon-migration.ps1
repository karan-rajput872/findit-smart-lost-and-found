# FindIt -- Production Neon PostgreSQL Backup & Exact Migration Runner
# Securely captures DATABASE_URL, takes verified backup, applies migration 20261017_01, and verifies schema.

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    $DatabaseUrl = $null
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$projectRoot = (Resolve-Path $scriptDir).Path
if (-not (Test-Path (Join-Path $projectRoot "backend\app\main.py"))) {
    if (Test-Path (Join-Path $projectRoot "..\backend\app\main.py")) {
        $projectRoot = (Resolve-Path (Join-Path $projectRoot "..")).Path
    }
}

$backendDir = Join-Path $projectRoot "backend"
$migrateScript = Join-Path $backendDir "scripts\backup_and_migrate_neon.py"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  FindIt -- Neon Production Backup & Migration Launcher" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Project Root : $projectRoot" -ForegroundColor Gray
Write-Host "Backend Dir  : $backendDir" -ForegroundColor Gray

if (-not (Test-Path $venvPython)) {
    Write-Host "`n[ERROR] Virtual environment interpreter not found at: $venvPython" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $migrateScript)) {
    Write-Host "`n[ERROR] Migration script not found at: $migrateScript" -ForegroundColor Red
    exit 1
}

# Acquire DATABASE_URL securely (masked, never logged or saved to disk)
$sec = $null
if ($DatabaseUrl) {
    if ($DatabaseUrl -is [System.Security.SecureString]) {
        $sec = $DatabaseUrl
    } else {
        $sec = ConvertTo-SecureString ($DatabaseUrl.ToString()) -AsPlainText -Force
    }
} elseif ($env:DATABASE_URL) {
    $sec = ConvertTo-SecureString $env:DATABASE_URL -AsPlainText -Force
} else {
    Write-Host "`nEnter your Neon PostgreSQL connection URL (input is masked for security):" -ForegroundColor Cyan
    $sec = Read-Host -AsSecureString "Neon DATABASE_URL"
}

if (-not $sec -or $sec.Length -eq 0) {
    Write-Host "`n[ERROR] No DATABASE_URL provided. Migration cancelled." -ForegroundColor Red
    exit 1
}

$bstr = [IntPtr]::Zero
$exitCode = 1

try {
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    $plainUrl = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

    if (-not $plainUrl -or $plainUrl.Trim().Length -eq 0) {
        Write-Host "`n[ERROR] Empty connection string. Migration cancelled." -ForegroundColor Red
        exit 1
    }

    $env:DATABASE_URL = $plainUrl
    $env:PYTHONPATH = $backendDir

    Write-Host "`nStarting authorized production backup and migration..." -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Gray

    Push-Location $backendDir
    try {
        & $venvPython $migrateScript
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

} catch {
    Write-Host "`n[ERROR] An unexpected error occurred: $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
} finally {
    Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
    if ($bstr -ne [IntPtr]::Zero) {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    if ($sec) {
        $sec.Dispose()
    }
}

exit $exitCode
