# =============================================================================
# NSE Options Intelligence Platform - Startup Script (PowerShell)
# =============================================================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " NSE Options Intelligence Platform" -ForegroundColor Cyan
Write-Host " Starting all services..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "  >> Please edit .env and set your passwords before continuing" -ForegroundColor Red
    Write-Host "  >> Minimum: Set POSTGRES_PASSWORD and APP_SECRET_KEY" -ForegroundColor Red
    Read-Host "Press Enter after editing .env to continue"
}

# Check Docker
try {
    docker info | Out-Null
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Pull and start infrastructure
Write-Host ""
Write-Host "Starting infrastructure (PostgreSQL, Redis, Qdrant, Ollama)..." -ForegroundColor Yellow
docker-compose up -d postgres redis qdrant ollama
Start-Sleep -Seconds 5

# Initialize DB
Write-Host ""
Write-Host "Initializing database schema..." -ForegroundColor Yellow
docker-compose exec -T postgres psql -U nse_admin -d nse_intelligence -f /docker-entrypoint-initdb.d/init_db.sql 2>$null

# Start backend
Write-Host ""
Write-Host "Starting FastAPI backend..." -ForegroundColor Yellow
docker-compose up -d backend celery-worker celery-beat

# Start frontend
Write-Host ""
Write-Host "Starting Next.js frontend..." -ForegroundColor Yellow
docker-compose up -d frontend nginx

# Wait for services
Start-Sleep -Seconds 8

# Health check
Write-Host ""
Write-Host "Running health checks..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 10
    Write-Host "[OK] Backend API is healthy: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "  Backend is starting up..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host " Platform is ready!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Dashboard   : http://localhost" -ForegroundColor Cyan
Write-Host "  API Docs    : http://localhost:8000/api/docs" -ForegroundColor Cyan
Write-Host "  Health      : http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run backfill (download historical data):" -ForegroundColor Yellow
Write-Host "  docker-compose exec backend python -c ""from app.scheduler.jobs import backfill_data; backfill_data.delay('2023-01-01', '2024-12-31')""" -ForegroundColor White
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f backend" -ForegroundColor White
Write-Host "  docker-compose logs -f celery-worker" -ForegroundColor White
