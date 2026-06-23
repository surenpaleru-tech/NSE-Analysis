# =============================================================================
# NSE Options Intelligence Platform — Stop Local Services (PowerShell)
# =============================================================================

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ServicesDir = Join-Path $ProjectRoot "local_services"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Stopping local services..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Stop PostgreSQL
$pgDest = Join-Path $ServicesDir "postgresql"
$pgBin = Join-Path $pgDest "pgsql\bin"
$pgData = Join-Path $pgDest "data"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"

if (Test-Path $pgData) {
    Write-Host "Stopping PostgreSQL..." -ForegroundColor Yellow
    $status = & $pgCtl -D $pgData status
    if ($status -match "server is running") {
        & $pgCtl -D $pgData stop
        Write-Host "[OK] PostgreSQL stopped." -ForegroundColor Green
    } else {
        Write-Host "[OK] PostgreSQL is not running." -ForegroundColor Green
    }
}

# 2. Stop Redis
Write-Host "Stopping Redis..." -ForegroundColor Yellow
Stop-Process -Name "redis-server" -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Redis stopped." -ForegroundColor Green

# 3. Stop Qdrant
Write-Host "Stopping Qdrant..." -ForegroundColor Yellow
Stop-Process -Name "qdrant" -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Qdrant stopped." -ForegroundColor Green

Write-Host "=========================================" -ForegroundColor Green
Write-Host " All local services stopped." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
