# NSE Analysis VPS Deployment

This document explains how to deploy the NSE Analysis platform on a fresh Ubuntu/Debian VPS.

## Prerequisites
- A Contabo VPS with Ubuntu or Debian
- A GitHub clone of this repository on the VPS
- SSH access to the VPS

## Bootstrap deployment

From the project root:

```bash
chmod +x bootstrap_vps.sh
sudo ./bootstrap_vps.sh
```

If the script creates a new `.env` file, update it first with production values before rerunning:

- `POSTGRES_PASSWORD`
- `APP_SECRET_KEY`
- `APP_DEBUG=false` (recommended for production)

## After bootstrap

Open your browser to:

- `http://<vps-ip>` for the frontend
- `http://<vps-ip>/api/docs` for API docs
- `http://<vps-ip>/health` for health checks

## Notes

- The bootstrap script installs Docker and Docker Compose plugin automatically.
- It does not configure SSL certificates. For HTTPS, add certs and update `nginx/nginx.conf`.
- Existing root `README.md` contains the full platform documentation.
