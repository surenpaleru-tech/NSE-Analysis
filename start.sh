#!/usr/bin/env bash
# =============================================================================
# NSE Options Intelligence Platform — Startup Script (Linux/macOS)
# =============================================================================
set -e

echo "========================================="
echo " NSE Options Intelligence Platform"
echo " Starting all services..."
echo "========================================="

# Check .env
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "  >> Edit .env to set POSTGRES_PASSWORD and APP_SECRET_KEY before continuing"
    read -p "Press Enter after editing .env..."
fi

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "✗ Docker is not running. Please start Docker." && exit 1
fi
echo "✓ Docker is running"

# Start infrastructure
echo "Starting infrastructure..."
docker-compose up -d postgres ollama
sleep 5

# Initialize DB
echo "Initializing database..."
docker-compose exec -T postgres psql -U nse_admin -d nse_intelligence \
    -f /docker-entrypoint-initdb.d/init_db.sql 2>/dev/null || true

# Start all services
echo "Starting backend and frontend..."
docker-compose up -d backend frontend nginx

sleep 8

echo ""
echo "========================================="
echo " Platform is ready!"
echo "========================================="
echo "  Dashboard : http://localhost"
echo "  API Docs  : http://localhost:8000/api/docs"
echo "  Health    : http://localhost:8000/health"
echo ""
