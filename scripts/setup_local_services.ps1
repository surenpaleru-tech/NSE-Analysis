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


# Cleanup temp dir
if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}

Write-Host "=========================================" -ForegroundColor Green
Write-Host " Local infrastructure setup complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
