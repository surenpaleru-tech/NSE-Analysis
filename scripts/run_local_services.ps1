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

# 2. Start Redis
$redisDest = Join-Path $ServicesDir "redis"
$redisServer = Join-Path $redisDest "redis-server.exe"

if (Test-Path $redisServer) {
    Write-Host "Starting Redis..." -ForegroundColor Yellow
    Start-Process -FilePath $redisServer -WorkingDirectory $redisDest -WindowStyle Minimized
    Start-Sleep -Seconds 1
    Write-Host "[OK] Redis started." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Redis server binary not found." -ForegroundColor Red
    exit 1
}

# 3. Start Qdrant
$qdrantDest = Join-Path $ServicesDir "qdrant"
$qdrantServer = Join-Path $qdrantDest "qdrant.exe"

if (Test-Path $qdrantServer) {
    Write-Host "Starting Qdrant..." -ForegroundColor Yellow
    Start-Process -FilePath $qdrantServer -WorkingDirectory $qdrantDest -WindowStyle Minimized
    Start-Sleep -Seconds 1
    Write-Host "[OK] Qdrant started." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Qdrant binary not found." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "All local services started successfully!" -ForegroundColor Green
Write-Host "Keeping this session alive to run the services. Stop/Kill this task to terminate them." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Green

# Block indefinitely
try {
    while ($true) {
        Start-Sleep -Seconds 5
    }
} finally {
    Write-Host "Termination signal received. Stopping local services..." -ForegroundColor Yellow
    # Stop Postgres
    & $pgCtl -D $pgData stop
    # Stop Redis
    Stop-Process -Name "redis-server" -Force -ErrorAction SilentlyContinue
    # Stop Qdrant
    Stop-Process -Name "qdrant" -Force -ErrorAction SilentlyContinue
    Write-Host "All local services stopped." -ForegroundColor Green
}
