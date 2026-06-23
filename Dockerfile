# ==============================================================================
# Stage 1: Build the Next.js Frontend
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Final Monolithic Runtime (Python + Node.js)
# ==============================================================================
FROM python:3.12-slim

# Install system dependencies, Node.js 20, and Supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ------------------------------------------------------------------------------
# Backend Setup
# ------------------------------------------------------------------------------
#COPY backend/pyproject.toml backend/
#WORKDIR /app/backend
# Install python dependencies
#RUN pip install --no-cache-dir -e ".[dev]"



# Copy backend source code
COPY backend/ /app/backend/

WORKDIR /app/backend

RUN pip install --no-cache-dir -e .

# ------------------------------------------------------------------------------
# Frontend Setup
# ------------------------------------------------------------------------------
WORKDIR /app/frontend
# Next.js standalone output contains everything needed to run the server
COPY --from=frontend-builder /app/frontend/.next/standalone ./
COPY --from=frontend-builder /app/frontend/.next/static ./.next/static
#COPY --from=frontend-builder /app/frontend/public ./public

# ------------------------------------------------------------------------------
# Supervisor Setup
# ------------------------------------------------------------------------------
WORKDIR /app
COPY render-supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Render uses the PORT environment variable to bind Web Services
ENV PORT=3000

# 3000 for frontend (Render), 8000 for backend (Internal)
EXPOSE $PORT
EXPOSE 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
