# NSE Analysis VPS Deployment

This document explains how to deploy the NSE Analysis platform and the NSE Analysis Pipeline together on a single Ubuntu/Debian VPS.

## Prerequisites
- A Contabo VPS with Ubuntu or Debian
- SSH access to the VPS
- Both repositories cloned under the same parent folder

## Repository layout

Example layout after integration:

```bash
/home/ubuntu/NSE Analysis
/home/ubuntu/NSE Analysis/pipeline
```

## Bootstrap the GUI stack

From the `NSE Analysis` project root:

```bash
chmod +x bootstrap_vps.sh
sudo ./bootstrap_vps.sh
```

If the script creates a new `.env` file, update it first with production values before rerunning:

- `POSTGRES_PASSWORD`
- `APP_SECRET_KEY`
- `APP_DEBUG=false` (recommended for production)

## Shared database setup

The GUI and pipeline must use the same PostgreSQL database. The easiest approach is to keep the same credentials in both project environments.

- `NSE Analysis` reads database settings from `backend/.env` or the root `.env` if configured.
- `NSE Analysis Pipeline` uses `DATABASE_URL` from environment variables.

## Run the pipeline manually

From the `NSE Analysis` repo root:

```bash
cd /home/ubuntu/"NSE Analysis"
docker compose -f docker-compose.pipeline.yml run --rm pipeline
```

This will build the pipeline image from the local `pipeline/` folder and execute the daily ingestion + analytics job against the shared `postgres` service.

## Schedule daily ingestion at 7 PM IST

Add a cron job on the Ubuntu host:

```bash
sudo EDITOR=nano crontab -e
```

If the server is already in IST:

```cron
0 19 * * 1-5 cd /home/ubuntu/"NSE Analysis" && docker compose -f docker-compose.pipeline.yml run --rm pipeline
```

If the server is in UTC, use:

```cron
0 13 * * 1-5 cd /home/ubuntu/"NSE Analysis" && docker compose -f docker-compose.pipeline.yml run --rm pipeline
```

## Verify the GUI

After the GUI stack is running, open:

- `http://<vps-ip>` for the frontend
- `http://<vps-ip>/api/docs` for the API docs
- `http://<vps-ip>/health` for health checks

## Notes

- The pipeline project already includes ingestion and analytics logic; running `run_pipeline.py` will download NSE data, load it into Postgres, compute analytics, and update recommendations.
- `docker-compose.pipeline.yml` is designed to use the same `nse-network` and shared database as the GUI stack.
- SSL is not configured by default; add certificates and update `nginx/nginx.conf` if you need HTTPS.
