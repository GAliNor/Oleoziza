#!/usr/bin/env bash
# Run once on a new server, before scripts/production-up.sh. Creates env_files/production/*.env from the templates and fills
# only the values still empty or set to change-me; a value already set is never touched, so running it again is harmless.
# Answers can be given ahead as environment variables (PUBLIC_HOST, ACME_EMAIL, SEED_OWNER_FIRST_NAME, SEED_OWNER_LAST_NAME,
# SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD); whatever is missing is asked.
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_DIR=env_files/production
DOCKER_ENV=$ENV_DIR/docker.env
BACKEND_ENV=$ENV_DIR/backend.env
FRONTEND_ENV=$ENV_DIR/frontend.env
COMPOSE=(docker compose -f docker-compose-deploy.yml --env-file "$DOCKER_ENV")
PASSWORD_MIN_LENGTH=8
EMAIL_PATTERN='^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'

read_value() {
  local line
  line=$(grep -m1 "^$2=" "$1" || true)
  printf '%s' "${line#*=}"
}

is_unset() {
  [[ -z "$1" || "$1" == change-me* ]]
}

write_value() {
  local tmp
  tmp=$(mktemp "$1.XXXXXX")
  KEY="$2" VALUE="$3" awk '
    index($0, ENVIRON["KEY"] "=") == 1 && !written { print ENVIRON["KEY"] "=" ENVIRON["VALUE"]; written = 1; next }
    { print }
    END { if (!written) print ENVIRON["KEY"] "=" ENVIRON["VALUE"] }
  ' "$1" > "$tmp"
  chmod 600 "$tmp"
  mv "$tmp" "$1"
  echo "  set $2 in $1"
}

ask() {
  local answer
  read -r -p "$1${2:+ [$2]}: " answer < /dev/tty
  printf '%s' "${answer:-${2:-}}"
}

fill_asked() {
  local file=$1 key=$2 question=$3 default=${4:-} pattern=${5:-.}
  is_unset "$(read_value "$file" "$key")" || return 0
  local value=${!key:-}
  while is_unset "$value" || [[ ! "$value" =~ $pattern ]]; do
    is_unset "$value" || echo "  \"$value\" doesn't look right, try again."
    value=$(ask "$question" "$default")
  done
  write_value "$file" "$key" "$value"
}

fill_public_host() {
  is_unset "$(read_value "$DOCKER_ENV" PUBLIC_HOST)" || return 0
  local value=${PUBLIC_HOST:-}
  while true; do
    value=${value#http://}
    value=${value#https://}
    value=${value%/}
    [[ "$value" =~ ^[0-9]+(\.[0-9]+){3}$ ]] && value=$value.sslip.io
    [[ "$value" =~ ^[A-Za-z0-9.-]+$ ]] && break
    [[ -n "$value" ]] && echo "  Only the host name, such as 51.75.28.177.sslip.io: no http://, no slash, no port."
    value=$(ask "Public host name (<server-ip>.sslip.io until a domain is bought)" "$(suggest_public_host)")
  done
  write_value "$DOCKER_ENV" PUBLIC_HOST "$value"
}

fill_secret() {
  local file=$1 key=$2 bytes=$3
  is_unset "$(read_value "$file" "$key")" || return 0
  write_value "$file" "$key" "$(od -An -tx1 -N"$bytes" /dev/urandom | tr -d ' \n')"
}

fill_owner_password() {
  is_unset "$(read_value "$BACKEND_ENV" SEED_OWNER_PASSWORD)" || return 0
  local value=${SEED_OWNER_PASSWORD:-} again
  while (( ${#value} < PASSWORD_MIN_LENGTH )); do
    read -r -s -p "Owner's first password ($PASSWORD_MIN_LENGTH characters at least; it must be changed at first login): " value < /dev/tty
    echo
    read -r -s -p "The same password again: " again < /dev/tty
    echo
    if [[ "$value" != "$again" ]]; then
      echo "  The two passwords differ."
      value=""
    elif (( ${#value} < PASSWORD_MIN_LENGTH )); then
      echo "  Too short."
    fi
  done
  write_value "$BACKEND_ENV" SEED_OWNER_PASSWORD "$value"
}

suggest_public_host() {
  local address
  address=$(ip -4 route get 1.1.1.1 2> /dev/null | awk '{ for (i = 1; i < NF; i++) if ($i == "src") print $(i + 1) }')
  [[ -n "$address" ]] && printf '%s.sslip.io' "$address"
}

fill_auth_keys() {
  local private_jwk public_jwk keys
  private_jwk=$(read_value "$BACKEND_ENV" AUTH_PRIVATE_JWK)
  public_jwk=$(read_value "$FRONTEND_ENV" VITE_AUTH_PUBLIC_JWK)
  if ! is_unset "$private_jwk" && ! is_unset "$public_jwk"; then
    return 0
  fi
  is_unset "$private_jwk" && private_jwk=""
  echo "Building the backend image to generate the token key pair..."
  "${COMPOSE[@]}" build --quiet oleoziza_backend
  keys=$(docker run --rm -e PRIVATE_JWK="$private_jwk" --entrypoint python "oleoziza-backend:$(read_value "$DOCKER_ENV" CURRENT_ENV)" -c '
import json, os
from cryptography.hazmat.primitives.asymmetric import ec
from jwt.algorithms import ECAlgorithm
existing = os.environ["PRIVATE_JWK"]
key = ECAlgorithm.from_jwk(existing) if existing else ec.generate_private_key(ec.SECP256R1())
compact = lambda jwk: json.dumps(json.loads(jwk), separators=(",", ":"))
print(compact(ECAlgorithm.to_jwk(key)))
print(compact(ECAlgorithm.to_jwk(key.public_key())))
')
  [[ -z "$private_jwk" ]] && write_value "$BACKEND_ENV" AUTH_PRIVATE_JWK "$(sed -n 1p <<< "$keys")"
  write_value "$FRONTEND_ENV" VITE_AUTH_PUBLIC_JWK "$(sed -n 2p <<< "$keys")"
}

for file in "$DOCKER_ENV" "$BACKEND_ENV" "$FRONTEND_ENV"; do
  [[ -f "$file" ]] || cp "$file.example" "$file"
  chmod 600 "$file"
done

owner_is_new=false
is_unset "$(read_value "$BACKEND_ENV" SEED_OWNER_EMAIL)" && owner_is_new=true

echo "Public address and the first Owner:"
fill_public_host
fill_asked "$BACKEND_ENV" SEED_OWNER_FIRST_NAME "Owner's first name"
fill_asked "$BACKEND_ENV" SEED_OWNER_LAST_NAME "Owner's last name"
fill_asked "$BACKEND_ENV" SEED_OWNER_EMAIL "Owner's email (their login)" "" "$EMAIL_PATTERN"
[[ "$owner_is_new" == true ]] && fill_owner_password
fill_asked "$DOCKER_ENV" ACME_EMAIL "Email for Let's Encrypt notices (an address, not yes/no)" "$(read_value "$BACKEND_ENV" SEED_OWNER_EMAIL)" "$EMAIL_PATTERN"

echo "Secrets:"
fill_secret "$DOCKER_ENV" DB_PASSWORD 24
fill_secret "$DOCKER_ENV" RUSTFS_ACCESS_KEY 8
fill_secret "$DOCKER_ENV" RUSTFS_SECRET_KEY 16
fill_auth_keys

echo
echo "Production settings are complete in $ENV_DIR (readable by you only)."
is_unset "$(read_value "$BACKEND_ENV" MAIL_SERVER)" && echo "No SMTP provider yet (MAIL_SERVER in $BACKEND_ENV): invitations and email codes won't be sent."
echo "Next: scripts/production-up.sh"
