#!/usr/bin/env bash
# Replaces the production database with a dump from backups/: scripts/production-restore.sh [file name, default
# oleoziza.dump]. To restore an older copy (from a VM snapshot, say), put it in backups/ first. The backend and worker
# stop meanwhile; the database is dropped and recreated, so anything written since the dump is lost. A dump older than
# the code is brought up to date by the backend's migrations when it starts again.
set -euo pipefail

cd "$(dirname "$0")/.."
DOCKER_ENV=env_files/production/docker.env
COMPOSE=(docker compose -f docker-compose-deploy.yml --env-file "$DOCKER_ENV")
DUMP_NAME=${1:-oleoziza.dump}

in_dump_container() {
  "${COMPOSE[@]}" exec -T oleoziza_db_dump sh -c "PGPASSWORD=\"\$DB_PASSWORD\" $1"
}

dump_date=$(in_dump_container "date -r '/backups/$DUMP_NAME' '+%Y-%m-%d %H:%M'") || { echo "Refused: backups/$DUMP_NAME not found." >&2; exit 1; }
read -r -p "Replace the production database with backups/$DUMP_NAME ($dump_date)? Type yes: " answer < /dev/tty
[[ "$answer" == yes ]] || { echo "Nothing changed."; exit 1; }

"${COMPOSE[@]}" stop oleoziza_backend oleoziza_worker
in_dump_container 'dropdb -h oleoziza_db_backend -U "$DB_USERNAME" --force --if-exists "$DB_DATABASE"'
in_dump_container 'createdb -h oleoziza_db_backend -U "$DB_USERNAME" "$DB_DATABASE"'
in_dump_container "pg_restore -h oleoziza_db_backend -U \"\$DB_USERNAME\" -d \"\$DB_DATABASE\" --no-owner '/backups/$DUMP_NAME'"
"${COMPOSE[@]}" up -d --wait --wait-timeout 300 oleoziza_backend oleoziza_worker
echo "Restored backups/$DUMP_NAME."
