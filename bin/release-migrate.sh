#!/usr/bin/env bash
set -euo pipefail

ATTEMPTS=${MIGRATE_MAX_ATTEMPTS:-6}
DELAY=${MIGRATE_DELAY_SECONDS:-10}

echo "[release] Running database migrations with up to ${ATTEMPTS} attempts..."

try_migrate() {
  # Rely on Django's DB connect_timeout (we set 5s in settings) so this returns fast on outages
  python manage.py migrate --noinput && return 0 || return 1
}

i=1
while [ "$i" -le "$ATTEMPTS" ]; do
  echo "[release] Attempt ${i}/${ATTEMPTS}..."
  if try_migrate; then
    echo "[release] Migrations applied."
    exit 0
  fi
  echo "[release] Migrate failed; retrying in ${DELAY}s..."
  sleep "$DELAY"
  i=$((i+1))
done

echo "[release] Skipping migrations after ${ATTEMPTS} attempts; proceeding with release."
exit 0

