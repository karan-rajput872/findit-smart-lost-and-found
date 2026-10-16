# FindIt -- Neon PostgreSQL Connection & Functional Verification Tool (Windows PowerShell)
# Reliably resolves project root and executes read-only verification without leaking secrets.

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    $DatabaseUrl = $null
)

$ErrorActionPreference = "Stop"

# 1. Resolve project root reliably from script location
$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$rootDir = (Resolve-Path $scriptDir).Path

# Handle case where script was invoked from a subdirectory (e.g. backend/)
if (Test-Path (Join-Path $rootDir "backend\app\main.py")) {
    $projectRoot = $rootDir
} elseif (Test-Path (Join-Path $rootDir "..\backend\app\main.py")) {
    $projectRoot = (Resolve-Path (Join-Path $rootDir "..")).Path
} else {
    $projectRoot = $rootDir
}

$backendDir = Join-Path $projectRoot "backend"
$verifyScript = Join-Path $backendDir "scripts\verify_neon_connection.py"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
$setupScript = Join-Path $projectRoot "setup-findit.ps1"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  FindIt -- Neon PostgreSQL Verification Launcher" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Project Root : $projectRoot" -ForegroundColor Gray
Write-Host "Backend Dir  : $backendDir" -ForegroundColor Gray

# 2. Check Virtual Environment
if (-not (Test-Path $venvPython)) {
    Write-Host "`n[ERROR] Virtual environment interpreter not found at:" -ForegroundColor Red
    Write-Host "  $venvPython" -ForegroundColor Yellow
    Write-Host "`nPlease initialize the environment first by running:" -ForegroundColor White
    Write-Host "  .\setup-findit.ps1" -ForegroundColor Yellow
    exit 1
}

# 3. Check Verification Script
if (-not (Test-Path $verifyScript)) {
    Write-Host "`n[ERROR] Verification script not found at:" -ForegroundColor Red
    Write-Host "  $verifyScript" -ForegroundColor Yellow
    exit 1
}

# 4. Check Required Dependencies in Virtual Environment
& $venvPython -c "import fastapi, sqlalchemy, psycopg, alembic" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Required Python packages are missing in the virtual environment." -ForegroundColor Red
    Write-Host "Please repair dependencies by running:" -ForegroundColor White
    Write-Host "  .\setup-findit.ps1" -ForegroundColor Yellow
    exit 1
}

# 5. Acquire DATABASE_URL securely (masked, never logged or saved to disk)
$sec = $null
if ($DatabaseUrl) {
    if ($DatabaseUrl -is [System.Security.SecureString]) {
        $sec = $DatabaseUrl
    } else {
        $sec = ConvertTo-SecureString ($DatabaseUrl.ToString()) -AsPlainText -Force
    }
} else {
    Write-Host "`nEnter your Neon PostgreSQL connection URL (input is masked for security):" -ForegroundColor Cyan
    $sec = Read-Host -AsSecureString "Neon DATABASE_URL"
}

if (-not $sec -or $sec.Length -eq 0) {
    Write-Host "`n[ERROR] No DATABASE_URL provided. Verification cancelled." -ForegroundColor Red
    exit 1
}

# 6. Execute verification with safe memory & environment cleanup
$bstr = [IntPtr]::Zero
$exitCode = 1

try {
    # Convert SecureString to unmanaged BSTR in memory
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    $plainUrl = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

    if (-not $plainUrl -or $plainUrl.Trim().Length -eq 0) {
        Write-Host "`n[ERROR] Empty connection string. Verification cancelled." -ForegroundColor Red
        exit 1
    }

    # Temporarily set environment variable for the child Python process
    $env:DATABASE_URL = $plainUrl

    Write-Host "`nRunning read-only verification against Neon PostgreSQL..." -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Gray

    # Execute Python verification script inside backend directory context
    Push-Location $backendDir
    try {
        & $venvPython $verifyScript
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

} catch {
    Write-Host "`n[ERROR] An unexpected error occurred during execution: $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
} finally {
    # 7. Strictly remove temporary environment variable
    Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue

    # 8. Zero unmanaged memory and dispose SecureString
    if ($bstr -ne [IntPtr]::Zero) {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    if ($sec) {
        $sec.Dispose()
    }
}

exit $exitCode
