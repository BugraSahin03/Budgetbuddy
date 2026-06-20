#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/budgetbuddy}"
SERVICE_USER="${SERVICE_USER:-budgetbuddy}"
SERVICE_GROUP="${SERVICE_GROUP:-budgetbuddy}"
SERVICE_NAME="${SERVICE_NAME:-budgetbuddy.service}"
DB_PATH="${BUDGETBUDDY_DB_PATH:-/var/lib/budgetbuddy/budgetbuddy.db}"
BACKUP_DIR="${BUDGETBUDDY_BACKUP_DIR:-/var/backups/budgetbuddy}"
SERVICE_SOURCE="${SERVICE_SOURCE:-$APP_DIR/scripts/deploy/budgetbuddy.service}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Bitte als root ausfuehren, damit systemd-Service und Zielrechte gesetzt werden koennen." >&2
  exit 1
fi

if [ ! -f "$SERVICE_SOURCE" ]; then
  echo "Service-Datei nicht gefunden: $SERVICE_SOURCE" >&2
  echo "Erwartung: Repo liegt bereits unter $APP_DIR und enthaelt scripts/deploy/budgetbuddy.service." >&2
  exit 1
fi

install -d -m 0755 -o "$SERVICE_USER" -g "$SERVICE_GROUP" "$APP_DIR"
install -d -m 0750 -o "$SERVICE_USER" -g "$SERVICE_GROUP" "$(dirname "$DB_PATH")"
install -d -m 0750 -o "$SERVICE_USER" -g "$SERVICE_GROUP" "$BACKUP_DIR"

chown -R "$SERVICE_USER:$SERVICE_GROUP" "$APP_DIR"

cd "$APP_DIR"

if [ -f data/budgetbuddy.db ]; then
  echo "WARNUNG: Lokale Testdatenbank data/budgetbuddy.db wird nicht nach $DB_PATH kopiert." >&2
fi

runuser -u "$SERVICE_USER" -- npm ci
runuser -u "$SERVICE_USER" -- npm run build

install -m 0644 "$SERVICE_SOURCE" "/etc/systemd/system/$SERVICE_NAME"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

for attempt in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/tmp/budgetbuddy-health.json; then
    echo "Healthcheck OK: $HEALTH_URL"
    cat /tmp/budgetbuddy-health.json
    rm -f /tmp/budgetbuddy-health.json
    exit 0
  fi
  sleep 2
done

rm -f /tmp/budgetbuddy-health.json
echo "Healthcheck fehlgeschlagen: $HEALTH_URL" >&2
journalctl -u "$SERVICE_NAME" -n 80 --no-pager >&2 || true
exit 1
