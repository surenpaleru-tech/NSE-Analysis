# =============================================================================
# NSE Options Intelligence Platform — Start Local Services (PowerShell)
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
$pgLog = Join-Path $pgData "pg_log.txt"

if (Test-Path $pgData) {
    Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
    # Check if Postgres is already running
    $status = & $pgCtl -D $pgData status
    if ($status -match "server is running") {
        Write-Host "[OK] PostgreSQL is already running." -ForegroundColor Green
    } else {
        & $pgCtl -D $pgData -l $pgLog start
        Start-Sleep -Seconds 3
        Write-Host "[OK] PostgreSQL started." -ForegroundColor Green
    }
} else {
    Write-Host "[ERROR] PostgreSQL is not initialized. Please run setup_local_services.ps1 first." -ForegroundColor Red
}


Write-Host ""
Write-Host "PostgreSQL started successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
