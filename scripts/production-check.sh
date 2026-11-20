#!/usr/bin/env bash
# Front-back check of the running production stack, run by scripts/production-up.sh and safe to run alone.
# CHECK_LOGIN=1 adds a login and refresh round trip with SEED_OWNER_* (only while that password still works: a wrong one
# counts toward the Owner's lockout). CHECK_RATE_LIMIT=1 adds the login rate-limit test, which blocks logins from this
# machine's address for about two minutes.
set -uo pipefail

cd "$(dirname "$0")/.."
DOCKER_ENV=env_files/production/docker.env
BACKEND_ENV=env_files/production/backend.env
COMPOSE=(docker compose -f docker-compose-deploy.yml --env-file "$DOCKER_ENV")
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT
FAILURES=0

read_value() {
  local line
  line=$(grep -m1 "^$2=" "$1" || true)
  printf '%s' "${line#*=}"
}

report() {
  if [[ "$1" == ok ]]; then
    echo "  ok    $2"
  else
    echo "  FAIL  $2${3:+ ($3)}"
    FAILURES=$((FAILURES + 1))
  fi
}

expect() {
  if [[ "$2" == "$3" ]]; then report ok "$1"; else report fail "$1" "expected $3, got $2"; fi
}

HOST=$(read_value "$DOCKER_ENV" PUBLIC_HOST)
PROFILE=$(read_value "$DOCKER_ENV" COMPOSE_PROFILES)
PROJECT=$(read_value "$DOCKER_ENV" COMPOSE_PROJECT_NAME)
BASE=https://$HOST
CURL=(curl -sS --max-time 15)
if [[ "$HOST" == localhost || "$HOST" == *.localhost ]]; then
  "${COMPOSE[@]}" cp oleoziza_caddy:/data/caddy/pki/authorities/local/root.crt "$WORK_DIR/caddy-root.crt" > /dev/null 2>&1
  CURL+=(--cacert "$WORK_DIR/caddy-root.crt" --resolve "$HOST:443:127.0.0.1" --resolve "$HOST:80:127.0.0.1")
fi

check_exposure() {
  local published unexpected
  published=$(docker ps --filter "label=com.docker.compose.project=$PROJECT" --format '{{.Names}} {{.Ports}}' | grep -- '->' || true)
  if [[ "$PROFILE" == tunnel ]]; then
    expect "nothing published under the tunnel profile" "$published" ""
    return
  fi
  unexpected=$(grep -v '^oleoziza_caddy_' <<< "$published" || true)
  expect "only Caddy publishes ports" "$unexpected" ""
  unexpected=$(grep '^oleoziza_caddy_' <<< "$published" | grep -oE ':[0-9]+->[0-9]+/(tcp|udp)' | sort -u | grep -vxE ':(80->80/tcp|443->443/tcp|443->443/udp)' || true)
  expect "Caddy publishes only 80, 443 and 443/udp" "$unexpected" ""
}

check_https() {
  local headers
  if [[ "$PROFILE" == caddy ]]; then
    expect "HTTP redirects to HTTPS" "$("${CURL[@]}" -o /dev/null -w '%{http_code} %{redirect_url}' "http://$HOST/")" "308 $BASE/"
  fi
  headers=$("${CURL[@]}" -o /dev/null -D - "$BASE/" | tr -d '\r') || { report fail "HTTPS answers with a trusted certificate" "curl failed"; return; }
  report ok "HTTPS answers with a trusted certificate"
  expect "the app page answers" "$(head -1 <<< "$headers" | cut -d' ' -f2)" "200"
  expect "HSTS sent once" "$(grep -ci '^strict-transport-security: max-age=2592000$' <<< "$headers")" "1"
  expect "/api answers on the same origin" "$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/api/health")" "200"
  expect "the backend builds https URLs" "$("${CURL[@]}" -o /dev/null -w '%{redirect_url}' "$BASE/api/site/seasons/")" "$BASE/api/site/seasons"
  expect "CORS accepts the public origin" "$("${CURL[@]}" -o /dev/null -D - -X OPTIONS "$BASE/api/auth/login" -H "Origin: $BASE" -H 'Access-Control-Request-Method: POST' | tr -d '\r' | grep -i '^access-control-allow-origin:' | cut -d' ' -f2)" "$BASE"
  expect "CORS refuses another origin" "$("${CURL[@]}" -o /dev/null -D - -X OPTIONS "$BASE/api/auth/login" -H 'Origin: https://elsewhere.example' -H 'Access-Control-Request-Method: POST' | tr -d '\r' | grep -ci '^access-control-allow-origin:')" "0"
  expect "the public bucket can't be listed" "$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/oleoziza-public/")" "403"
  expect "the private bucket can't be listed" "$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/oleoziza-private/")" "403"
}

check_forged_ip() {
  local marker logged
  marker=check-$RANDOM$RANDOM
  "${CURL[@]}" -o /dev/null "$BASE/api/health?$marker" -H 'CF-Connecting-IP: 203.0.113.77' -H 'X-Forwarded-For: 203.0.113.78' -H 'X-Real-IP: 203.0.113.79'
  sleep 1
  logged=$("${COMPOSE[@]}" logs --since 2m oleoziza_backend 2> /dev/null | grep "$marker" || true)
  if [[ -z "$logged" ]]; then
    report fail "a forged client address is ignored" "request not found in the backend log"
  elif grep -q '203\.0\.113\.7' <<< "$logged"; then
    report fail "a forged client address is ignored" "$logged"
  else
    report ok "a forged client address is ignored (backend saw $(grep -oE '[0-9a-f.:]+:[0-9]+ - "GET' <<< "$logged" | head -1 | sed -E 's/:[0-9]+ - "GET$//'))"
  fi
}

check_login() {
  local email password body cookie_line user_id token illustration_url
  email=$(read_value "$BACKEND_ENV" SEED_OWNER_EMAIL)
  password=$(read_value "$BACKEND_ENV" SEED_OWNER_PASSWORD)
  body=$(EMAIL="$email" PASSWORD="$password" python3 -c 'import json, os; print(json.dumps({"identifier": os.environ["EMAIL"], "method": "email_password", "secret": os.environ["PASSWORD"]}))')
  "${CURL[@]}" -o "$WORK_DIR/login.json" -D "$WORK_DIR/login.headers" -c "$WORK_DIR/cookies" -H "Origin: $BASE" -H 'Content-Type: application/json' -d "$body" "$BASE/api/auth/login"
  expect "the Owner logs in" "$(head -1 "$WORK_DIR/login.headers" | cut -d' ' -f2)" "200"
  cookie_line=$(tr -d '\r' < "$WORK_DIR/login.headers" | grep -i '^set-cookie: refresh_token_' || true)
  for attribute in Secure HttpOnly 'Path=/api/auth' 'SameSite=strict'; do
    if grep -qi "; $attribute" <<< "$cookie_line"; then report ok "refresh cookie: $attribute"; else report fail "refresh cookie: $attribute" "$cookie_line"; fi
  done
  user_id=$(sed -E 's/^set-cookie: refresh_token_([^=]+)=.*/\1/I' <<< "$cookie_line")
  expect "the refresh cookie refreshes" "$("${CURL[@]}" -o /dev/null -w '%{http_code}' -b "$WORK_DIR/cookies" -c "$WORK_DIR/cookies" -H "Origin: $BASE" -H 'Content-Type: application/json' -d "{\"userId\": \"$user_id\"}" "$BASE/api/auth/refresh")" "200"
  token=$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1]))["accessToken"])' "$WORK_DIR/login.json")
  illustration_url=$("${CURL[@]}" -H "Authorization: Bearer $token" "$BASE/api/site/season-illustrations" | python3 -c 'import json, sys; items = json.load(sys.stdin); print(items[0]["illustrationUrl"] if items else "")')
  if [[ -z "$illustration_url" ]]; then
    report fail "a Season Illustration loads" "none registered"
    return
  fi
  expect "Season Illustration URLs stay on the public origin" "${illustration_url%%/oleoziza-public/*}" "$BASE"
  expect "a Season Illustration loads" "$("${CURL[@]}" -o /dev/null -w '%{http_code} %{content_type}' "$illustration_url")" "200 image/webp"
}

check_rate_limit() {
  local codes
  codes=$(for _ in $(seq 1 25); do "${CURL[@]}" -o /dev/null -w '%{http_code}\n' -H 'Content-Type: application/json' -d '{"identifier": "rate-limit-check@invalid.test", "method": "email_password", "secret": "wrong-secret"}' "$BASE/api/auth/login"; done | sort | uniq -c | tr -s ' ' | tr '\n' ',')
  if grep -q ' 429' <<< "$codes"; then report ok "login attempts are rate-limited ($codes)"; else report fail "login attempts are rate-limited" "$codes"; fi
}

echo "Checking $BASE ($PROFILE):"
check_exposure
check_https
check_forged_ip
[[ "${CHECK_LOGIN:-}" == 1 ]] && check_login
[[ "${CHECK_RATE_LIMIT:-}" == 1 ]] && check_rate_limit
if (( FAILURES > 0 )); then
  echo "$FAILURES check(s) failed."
  exit 1
fi
echo "All checks passed."
