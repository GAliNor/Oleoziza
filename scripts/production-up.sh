#!/usr/bin/env bash
# Run on the server after every git pull, the first install included, once scripts/production-init.sh has filled
# env_files/production. It first reruns production-init.sh, which only adds what a new version needs (new keys, the AI
# master key, the frontend's module list) and never changes a value already set. On an update, it then dumps the database to backups/before-deploy.dump (restored with
# scripts/production-restore.sh before-deploy.dump); then builds the images, recreates what changed (a few seconds of
# downtime; the backend runs the migrations as it starts), loads the reference data, the Season Illustrations, the
# Oujda Site (only while no Site exists) and the first Owner, and ends with scripts/production-check.sh.
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_DIR=env_files/production
DOCKER_ENV=$ENV_DIR/docker.env
BACKEND_ENV=$ENV_DIR/backend.env
FRONTEND_ENV=$ENV_DIR/frontend.env
COMPOSE=(docker compose -f docker-compose-deploy.yml --env-file "$DOCKER_ENV")

read_value() {
  local line
  line=$(grep -m1 "^$2=" "$1" || true)
  printf '%s' "${line#*=}"
}

refuse() {
  echo "Refused: $1" >&2
  exit 1
}

check_settings() {
  local file unset_keys profile
  for file in "$DOCKER_ENV" "$BACKEND_ENV" "$FRONTEND_ENV"; do
    [[ -f "$file" ]] || refuse "$file is missing. Run scripts/production-init.sh first."
    unset_keys=$(grep -E '^[A-Z_]+=change-me' "$file" | cut -d= -f1 | tr '\n' ' ' || true)
    [[ -z "$unset_keys" ]] || refuse "$file still holds change-me for: $unset_keys. Run scripts/production-init.sh."
  done
  [[ "$(read_value "$DOCKER_ENV" CURRENT_ENV)" == production ]] || refuse "CURRENT_ENV must be production in $DOCKER_ENV."
  case "$(read_value "$DOCKER_ENV" COMPOSE_PROJECT_NAME)" in
    "" | oleoziza) refuse "COMPOSE_PROJECT_NAME in $DOCKER_ENV must be set, and not to oleoziza (the dev stack's project): use oleoziza-production." ;;
  esac
  profile=$(read_value "$DOCKER_ENV" COMPOSE_PROFILES)
  case "$profile" in
    caddy)
      [[ "$(read_value "$DOCKER_ENV" PUBLIC_HOST)" =~ ^[A-Za-z0-9.-]+$ ]] || refuse "PUBLIC_HOST in $DOCKER_ENV must be a bare host name, such as 51.75.28.177.sslip.io (no http://, no slash, no port)."
      [[ "$(read_value "$DOCKER_ENV" ACME_EMAIL)" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || refuse "ACME_EMAIL in $DOCKER_ENV must be an email address (Let's Encrypt refuses anything else)."
      ;;
    tunnel)
      [[ -n "$(read_value "$DOCKER_ENV" CLOUDFLARE_TUNNEL_TOKEN)" ]] || refuse "CLOUDFLARE_TUNNEL_TOKEN is empty in $DOCKER_ENV."
      ;;
    *) refuse "COMPOSE_PROFILES in $DOCKER_ENV must be caddy or tunnel." ;;
  esac
  if [[ -z "$(read_value "$BACKEND_ENV" MAIL_SERVER)" ]]; then
    echo "Warning: no SMTP provider (MAIL_SERVER in $BACKEND_ENV): invitations and email codes won't be sent."
  fi
}

dump_before_deploy() {
  if [[ -z "$("${COMPOSE[@]}" ps --status running -q oleoziza_db_dump 2> /dev/null)" ]]; then
    echo "No database running yet: nothing to dump."
    return
  fi
  echo "Dumping the database to backups/before-deploy.dump..."
  "${COMPOSE[@]}" exec -T oleoziza_db_dump sh -c 'umask 077 && PGPASSWORD="$DB_PASSWORD" pg_dump -h oleoziza_db_backend -U "$DB_USERNAME" -d "$DB_DATABASE" --format=custom --file=/backups/before-deploy.dump.partial && mv /backups/before-deploy.dump.partial /backups/before-deploy.dump' \
    || refuse "the database dump failed, so nothing was deployed. The running version is untouched."
}

run_seed() {
  "${COMPOSE[@]}" exec -T oleoziza_backend python -m seeds "$1"
}

scripts/production-init.sh
check_settings
echo "Deploying $(git log -1 --format='%h %s (%cd)' --date=format:'%Y-%m-%d %H:%M')"
dump_before_deploy

echo "Building the images..."
"${COMPOSE[@]}" build

echo "Starting the stack..."
"${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 300

echo "Loading the data..."
run_seed reference
run_seed illustrations
run_seed site
owner_result=$(run_seed owner)
echo "$owner_result"

public_url="https://$(read_value "$DOCKER_ENV" PUBLIC_HOST)"
if [[ "$owner_result" == "owner: created" ]]; then
  echo "The Owner logs in at $public_url as $(read_value "$BACKEND_ENV" SEED_OWNER_EMAIL) with the password given to production-init.sh, and must choose a new one."
  echo "Once that's done, delete the SEED_OWNER_PASSWORD line from $BACKEND_ENV."
  CHECK_LOGIN=1 scripts/production-check.sh
else
  [[ -n "$(read_value "$BACKEND_ENV" SEED_OWNER_PASSWORD)" ]] && echo "Reminder: SEED_OWNER_PASSWORD can be deleted from $BACKEND_ENV."
  scripts/production-check.sh
fi
echo "Oleoziza is up at $public_url"
