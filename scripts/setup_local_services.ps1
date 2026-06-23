# =============================================================================
# NSE Options Intelligence Platform — Local Services Setup Script (PowerShell)
# =============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Get paths
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ServicesDir = Join-Path $ProjectRoot "local_services"
$TempDir = Join-Path $ServicesDir "temp"

# Ensure directories exist
if (-not (Test-Path $ServicesDir)) {
    New-Item -ItemType Directory -Path $ServicesDir | Out-Null
}
if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir | Out-Null
}

# 1. Download & Extract PostgreSQL
$pgDest = Join-Path $ServicesDir "postgresql"
$pgBin = Join-Path $pgDest "pgsql\bin"
if (-not (Test-Path $pgDest)) {
    Write-Host "Downloading PostgreSQL 16.3 binaries..." -ForegroundColor Yellow
    $pgZip = Join-Path $TempDir "postgresql.zip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://get.enterprisedb.com/postgresql/postgresql-16.3-1-windows-x64-binaries.zip" -OutFile $pgZip
    
    Write-Host "Extracting PostgreSQL..." -ForegroundColor Yellow
    Expand-Archive -Path $pgZip -DestinationPath $pgDest
    Remove-Item $pgZip
} else {
    Write-Host "PostgreSQL already downloaded." -ForegroundColor Green
}

# Initialize PostgreSQL Data Directory
$pgData = Join-Path $pgDest "data"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$initdb = Join-Path $pgBin "initdb.exe"
if (-not (Test-Path $pgData)) {
    Write-Host "Initializing PostgreSQL database..." -ForegroundColor Yellow
    
    # Run initdb
    & $initdb -D $pgData -U nse_admin -A trust
    
    # Start Postgres temporarily to create the database
    Write-Host "Starting PostgreSQL temporarily to create nse_intelligence database..." -ForegroundColor Yellow
    $pgLog = Join-Path $pgData "pg_log.txt"
    & $pgCtl -D $pgData -l $pgLog start
    Start-Sleep -Seconds 5
    
    # Create DB
    & (Join-Path $pgBin "createdb.exe") -U nse_admin nse_intelligence
    
    # Stop Postgres
    & $pgCtl -D $pgData stop
    Start-Sleep -Seconds 2
    Write-Host "PostgreSQL database initialized successfully." -ForegroundColor Green
} else {
    Write-Host "PostgreSQL database directory already exists." -ForegroundColor Green
}

# 2. Download & Extract Redis
$redisDest = Join-Path $ServicesDir "redis"
if (-not (Test-Path $redisDest)) {
    Write-Host "Downloading Redis 5.0 binaries..." -ForegroundColor Yellow
    $redisZip = Join-Path $TempDir "redis.zip"
    Invoke-WebRequest -Uri "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip" -OutFile $redisZip
    
    Write-Host "Extracting Redis..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $redisDest | Out-Null
    Expand-Archive -Path $redisZip -DestinationPath $redisDest
    Remove-Item $redisZip
    Write-Host "Redis extracted successfully." -ForegroundColor Green
} else {
    Write-Host "Redis already downloaded." -ForegroundColor Green
}

# 3. Download & Extract Qdrant
$qdrantDest = Join-Path $ServicesDir "qdrant"
if (-not (Test-Path $qdrantDest)) {
    Write-Host "Downloading Qdrant 1.11.0 binary..." -ForegroundColor Yellow
    $qdrantZip = Join-Path $TempDir "qdrant.zip"
    Invoke-WebRequest -Uri "https://github.com/qdrant/qdrant/releases/download/v1.11.0/qdrant-x86_64-pc-windows-msvc.zip" -OutFile $qdrantZip
    
    Write-Host "Extracting Qdrant..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $qdrantDest | Out-Null
    Expand-Archive -Path $qdrantZip -DestinationPath $qdrantDest
    Remove-Item $qdrantZip
    Write-Host "Qdrant extracted successfully." -ForegroundColor Green
} else {
    Write-Host "Qdrant already downloaded." -ForegroundColor Green
}

# Cleanup temp dir
if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}

Write-Host "=========================================" -ForegroundColor Green
Write-Host " Local infrastructure setup complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
