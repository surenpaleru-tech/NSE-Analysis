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

# 2. Start Redis
$redisDest = Join-Path $ServicesDir "redis"
$redisServer = Join-Path $redisDest "redis-server.exe"

if (Test-Path $redisServer) {
    # Check if port 6379 is in use
    $portUse = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue
    if ($portUse) {
        Write-Host "[OK] Redis (or another service on 6379) is already running." -ForegroundColor Green
    } else {
        Write-Host "Starting Redis..." -ForegroundColor Yellow
        Start-Process -FilePath $redisServer -WorkingDirectory $redisDest -WindowStyle Minimized
        Start-Sleep -Seconds 1
        Write-Host "[OK] Redis started." -ForegroundColor Green
    }
} else {
    Write-Host "[ERROR] Redis is not installed. Please run setup_local_services.ps1 first." -ForegroundColor Red
}

# 3. Start Qdrant
$qdrantDest = Join-Path $ServicesDir "qdrant"
$qdrantServer = Join-Path $qdrantDest "qdrant.exe"

if (Test-Path $qdrantServer) {
    # Check if port 6333 is in use
    $portUse = Get-NetTCPConnection -LocalPort 6333 -ErrorAction SilentlyContinue
    if ($portUse) {
        Write-Host "[OK] Qdrant (or another service on 6333) is already running." -ForegroundColor Green
    } else {
        Write-Host "Starting Qdrant..." -ForegroundColor Yellow
        Start-Process -FilePath $qdrantServer -WorkingDirectory $qdrantDest -WindowStyle Minimized
        Start-Sleep -Seconds 1
        Write-Host "[OK] Qdrant started." -ForegroundColor Green
    }
} else {
    Write-Host "[ERROR] Qdrant is not installed. Please run setup_local_services.ps1 first." -ForegroundColor Red
}

Write-Host ""
Write-Host "All local services started successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
