#!/usr/bin/env bash
# Bootstrap script for Ubuntu/Debian VPS deployment
# Installs Docker, Docker Compose plugin, and starts the NSE Analysis stack.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run this script as root or with sudo."
  exit 1
fi

echo "=== NSE Analysis VPS Bootstrap ==="

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker Engine..."
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg lsb-release

  mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
else
  echo "Docker is already installed."
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker installation failed or docker is not available." >&2
  exit 1
fi

cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
  echo "No .env file found. Creating from .env.example..."
  cp .env.example .env
  echo "Created .env from .env.example. Please edit .env and set POSTGRES_PASSWORD, APP_SECRET_KEY, and any other production values before continuing."
  exit 0
fi

if [ ! -f "docker-compose.yml" ]; then
  echo "docker-compose.yml not found in project root." >&2
  exit 1
fi

echo "Starting NSE Analysis stack with Docker Compose..."
docker compose up -d --build

echo ""
echo "Bootstrap complete."
echo "Visit http://<vps-ip> for the frontend and http://<vps-ip>/api/docs for API docs."
