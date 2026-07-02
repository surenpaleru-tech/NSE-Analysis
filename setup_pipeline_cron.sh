#!/usr/bin/env bash
# Setup a daily cron job at 7 PM IST to run the NSE pipeline.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run this script as root or with sudo."
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
DOCKER_PATH="$(command -v docker || true)"
if [ -z "$DOCKER_PATH" ]; then
  echo "Docker is not installed or not found in PATH." >&2
  exit 1
fi

LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/pipeline_cron.log"

CRON_ENTRY="CRON_TZ=Asia/Kolkata
0 19 * * 1-5 cd '$PROJECT_ROOT' && $DOCKER_PATH compose -f docker-compose.yml -f docker-compose.pipeline.yml run --rm pipeline >> '$LOG_FILE' 2>&1"

# Preserve existing crontab entries, but remove any previous pipeline entry from this project.
if crontab -l 2>/dev/null | grep -q -F "$PROJECT_ROOT/docker-compose.yml -f docker-compose.pipeline.yml run --rm pipeline"; then
  crontab -l 2>/dev/null | grep -v -F "$PROJECT_ROOT/docker-compose.yml -f docker-compose.pipeline.yml run --rm pipeline" > /tmp/current_cron.$$ || true
else
  crontab -l 2>/dev/null > /tmp/current_cron.$$ || true
fi

echo "$CRON_ENTRY" >> /tmp/current_cron.$$
crontab /tmp/current_cron.$$
rm -f /tmp/current_cron.$$

echo "Cron job installed: 7 PM IST on weekdays."
echo "Pipeline log: $LOG_FILE"
