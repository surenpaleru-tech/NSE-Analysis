# =============================================================================
# NSE Options Intelligence Platform — Run Local Services (PowerShell)
# =============================================================================

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ServicesDir = Join-Path $ProjectRoot "local_services"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Starting local services..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Start PostgreSQL
$pgDest = Join-Path $ServicesDir "postgresql"
$pgBin = Join-Path $pgDest "pgsql\bin"
$pgData = Join-Path $pgDest "data"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$pgLog = Join-Path $ServicesDir "postgresql.log"

if (Test-Path $pgData) {
    $pidFile = Join-Path $pgData "postmaster.pid"
    if (Test-Path $pidFile) {
        Write-Host "Found leftover postmaster.pid lock file. Cleaning it up..." -ForegroundColor Yellow
        Remove-Item $pidFile -Force
    }
    Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
    & $pgCtl -D $pgData -l $pgLog start
    Start-Sleep -Seconds 3
    Write-Host "[OK] PostgreSQL started." -ForegroundColor Green
} else {
    Write-Host "[ERROR] PostgreSQL data folder not found. Please run setup first." -ForegroundColor Red
    exit 1
}


Write-Host ""
Write-Host "PostgreSQL local service started successfully!" -ForegroundColor Green
Write-Host "Keeping this session alive to run PostgreSQL. Stop/Kill this task to terminate it." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Green

# Block indefinitely
try {
    while ($true) {
        Start-Sleep -Seconds 5
    }
} finally {
    Write-Host "Termination signal received. Stopping PostgreSQL..." -ForegroundColor Yellow
    # Stop Postgres
    & $pgCtl -D $pgData stop
    Write-Host "PostgreSQL stopped." -ForegroundColor Green
}
