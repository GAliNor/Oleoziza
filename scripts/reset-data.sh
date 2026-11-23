#!/usr/bin/env bash
# Deletes the records of the business modules you choose, to test again after a deploy: scripts/reset-data.sh [dev|production],
# production by default on a server that has env_files/production/docker.env. Owners, Sites and reference data always stay.
# The database is dumped to backups/ first; nothing is deleted if the dump fails, or before you type "reset".
set -euo pipefail

cd "$(dirname "$0")/.."
DOCKER_ENV=env_files/production/docker.env
TARGET=${1:-$([[ -f "$DOCKER_ENV" ]] && echo production || echo dev)}

case "$TARGET" in
  production) COMPOSE=(docker compose -f docker-compose-deploy.yml --env-file "$DOCKER_ENV") ;;
  dev) COMPOSE=(docker compose) ;;
  *) echo "Usage: scripts/reset-data.sh [dev|production]" >&2; exit 1 ;;
esac

resets() {
  "${COMPOSE[@]}" exec -T oleoziza_backend python -m resets "$@"
}

mapfile -t LINES < <(resets list < /dev/null)
[[ ${#LINES[@]} -gt 0 ]] || { echo "Refused: the backend is not running." >&2; exit 1; }

echo "Reset the $TARGET data. Modules:"
NAMES=()
for index in "${!LINES[@]}"; do
  NAMES+=("${LINES[$index]%%$'\t'*}")
  printf '  %d. %s\n' "$((index + 1))" "${LINES[$index]#*$'\t'}"
done
read -r -p "Numbers to reset, separated by spaces (or: all): " ANSWER < /dev/tty

CHOSEN=()
if [[ "$ANSWER" == all ]]; then
  CHOSEN=("${NAMES[@]}")
else
  for number in $ANSWER; do
    [[ "$number" =~ ^[0-9]+$ ]] && ((number >= 1 && number <= ${#NAMES[@]})) || { echo "Unknown number: $number. Nothing changed." >&2; exit 1; }
    CHOSEN+=("${NAMES[$((number - 1))]}")
  done
fi
[[ ${#CHOSEN[@]} -gt 0 ]] || { echo "Nothing chosen. Nothing changed."; exit 1; }

echo
echo "This would delete:"
resets plan "${CHOSEN[@]}" < /dev/null
echo
echo "A phone holding records not sent yet would send them back afterwards. Empty it first: let it sync, or sign out and clear the site's data in its browser."
read -r -p "Type reset to dump the database and delete: " ANSWER < /dev/tty
[[ "$ANSWER" == reset ]] || { echo "Nothing changed."; exit 1; }

mkdir -p backups
DUMP="backups/before-reset-$(date '+%Y%m%d-%H%M%S').dump"
if ! "${COMPOSE[@]}" exec -T oleoziza_db_backend sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < /dev/null > "$DUMP" || [[ ! -s "$DUMP" ]]; then
  rm -f "$DUMP"
  echo "Refused: the dump failed. Nothing changed." >&2
  exit 1
fi
echo "Dumped to $DUMP."

resets apply "${CHOSEN[@]}" < /dev/null
echo
echo "Done. To go back (stored files excepted):"
if [[ "$TARGET" == production ]]; then
  echo "  scripts/production-restore.sh $(basename "$DUMP")"
else
  echo "  docker compose exec -T oleoziza_db_backend sh -c 'pg_restore --clean --if-exists --no-owner -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\"' < $DUMP"
fi
