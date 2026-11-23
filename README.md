# Oleoziza

Management of one owner's olive oil mills: Receptions, Pressings, Client accounts, Payments and stock, across several Sites.

## Repository

| Folder | What it holds |
| --- | --- |
| [frontend/](frontend/) | Vue 3 PWA (front MVP, mock services for now). See its [README](frontend/README.md). |
| [backend/](backend/) | FastAPI API (health check for now). See its [README](backend/README.md). |
| [docker/](docker/), [env_files/](env_files/), [config/](config/) | Dockerfiles, per-environment variables, nginx config. |
| [docs/](docs/) | Inspiration and reference material. |
| [.wayfinder/](.wayfinder/map.md) | Planning map and decision tickets. |

Domain vocabulary is in [GLOSSARY.md](GLOSSARY.md).

## Docker

`.env` links to `env_files/development/docker.env`.

```bash
# dev: frontend, backend, postgres, redis, rustfs, pgadmin and mailhog on one network, with hot reload
docker compose up -d --build
```

Production is described in [Production](#production) below.

| Service | URL | Notes |
| --- | --- | --- |
| Frontend (Vite) | http://localhost:32501 | |
| Backend (FastAPI) | http://localhost:32551 | docs at `/docs`, health at `/api/health`; runs `alembic upgrade head` on start |
| Postgres 16.2 | `localhost:32509` | db `oleoziza`, user/password `root`/`root`; host `oleoziza_db_backend` inside the network |
| pgAdmin | http://localhost:32520 | desktop mode, no login |
| MailHog | http://localhost:32586 | backend sends to `oleoziza_mailhog:1025` |
| RustFS | http://localhost:32590 (S3 API), http://localhost:32591/rustfs/console/ | login `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` from `docker.env`; host `oleoziza-rustfs:9000` inside the network |
| Redis | inside the network only | Celery broker (DB 0) and results (DB 1), host `oleoziza_redis` |
| Celery worker | — | `oleoziza_worker`, reloads on Python changes |
| Flower | http://localhost:32555 | Celery monitoring, login `admin` / `admin` (`FLOWER_BASIC_AUTH`) |

First start, after `docker compose up -d --build` (the backend runs `alembic upgrade head` on start):

```bash
docker compose exec oleoziza_backend python -m seeds reference   # Provinces, towns, olive varieties, Expense Categories
docker compose exec oleoziza_backend python -m seeds illustrations   # Season Illustrations from backend/seeds/fixtures/seasons (also run by demo)
docker compose exec oleoziza_backend python -m seeds demo        # dev only: Oujda, the open Season, its Configuration and the Owner (m.taibi@oleoziza.ma / Oleoziza2026, or 0661100001 + PIN 1234)
docker compose exec oleoziza_backend python -m seeds audit       # dev only, after demo: a second mill (Berkane) and four Users for Site-isolation and load tests, password AuditLocal2026
```

The front's `VITE_API_MODULES` (in `env_files/<env>/frontend.env`) lists the modules served by the backend; `auth`, `configuration`, `season` and `user` are plugged, the rest stays on mocks. Every other User is created from the Users page: with a first password (default) or an Invitation, whose email lands in MailHog and whose SMS is written to the worker log (`docker compose logs oleoziza_worker`). In production, `scripts/production-up.sh` creates the first Owner (see [Production](#production)).

Backend deps are managed with uv (`uv add --bounds exact <pkg>`, then rebuild). Run Alembic and the tests inside the container: `docker compose exec oleoziza_backend alembic revision --autogenerate -m "..."`, `docker compose exec oleoziza_backend pytest`.

### RustFS

RustFS runs in both compose files. In dev it publishes its S3 API and console on `127.0.0.1` (see the table above); in production it publishes nothing and is reached only through nginx's bucket paths. Its keys live once, in `env_files/<env>/docker.env`, and compose hands them to RustFS, the backend and the worker.

The backend uses it through `core/integrations/rustfs/rustfs_client.py`. On every start, after `alembic upgrade head`, the backend runs `python -m core.integrations.rustfs`, which creates the two buckets when missing and lets anyone read the public one: `RUSTFS_PRIVATE_BUCKET` (`oleoziza-private`: Payment Proofs, served through signed URLs) and `RUSTFS_PUBLIC_BUCKET` (`oleoziza-public`: Season Illustrations and future images, anonymous `s3:GetObject` only). `RUSTFS_PUBLIC_ENDPOINT_URL` is the address browsers use to open files.

## Production

`docker-compose-deploy.yml` runs under its own compose project (`COMPOSE_PROJECT_NAME=oleoziza-production` in `env_files/production/docker.env`), so its volumes never mix with the dev stack's. The images are built on the server. Only the entry point is reachable:
- `COMPOSE_PROFILES=caddy` (default): Caddy gets a Let's Encrypt certificate for `PUBLIC_HOST` and publishes 80, 443 and 443/udp. It forwards to nginx, which serves the front, proxies `/api/` to the backend and the bucket paths to RustFS, and sends HSTS and the login rate limit.
- `COMPOSE_PROFILES=tunnel`: a Cloudflare Tunnel instead, publishing nothing.

Postgres, Redis, the backend, the worker, nginx and RustFS publish no port. The RustFS console is reached through SSH when needed: `ssh -L 9001:<rustfs container IP>:9001 <server>`, with the IP from `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' oleoziza_rustfs_production`, then http://localhost:9001/rustfs/console/.

On a new server, from the repo root (Docker and Git installed, ports 80 and 443 open):

```bash
scripts/production-init.sh   # once: asks the public host (<server-ip>.sslip.io until a domain is bought), the Owner and the Let's Encrypt email; generates every secret
scripts/production-up.sh     # after every git pull: dumps the database, builds, starts (migrations included), loads reference data, Season Illustrations, the Oujda Site and the Owner, then runs the check
```

`production-init.sh` fills only values that are empty or still `change-me` in `env_files/production/*.env` (mode 600), so running it again changes nothing. `production-up.sh` refuses a missing or `change-me` setting, warns when there is no SMTP provider, prints the commit it deploys, dumps the running database to `backups/before-deploy.dump` before touching anything (stopping if the dump fails; `scripts/production-restore.sh before-deploy.dump` goes back to it), and ends with `scripts/production-check.sh` (HTTPS and HSTS, same-origin `/api`, CORS, buckets unlistable, forged client IP ignored, only Caddy's ports published, the database at the latest migration, the worker's schedule started; after the Owner's creation, also login, the refresh cookie and a Season Illustration). `CHECK_RATE_LIMIT=1 scripts/production-check.sh` adds the login rate limit (it blocks logins from that machine for about two minutes).

The Oujda mill (code OJ) is created only while no Site exists; its prices and equipment are set on the Configuration page. The first Owner logs in with the password given to `production-init.sh` and must choose a new one. Then delete `SEED_OWNER_PASSWORD` from `env_files/production/backend.env`. Moving to a domain: point its A record at the server, change `PUBLIC_HOST` in `docker.env`, and run `scripts/production-up.sh` again. Installed PWAs and sessions stay tied to the old address.

Browser checklist after a first start or a change of address:
1. Log in as the Owner, choose the new password, and reach the Home.
2. Reload: still logged in.
3. Configuration: « + Préparer » shows the Season Illustrations, and preparing a Season with one shows it on its banner, in light and dark mode.
4. No mixed-content warning in the browser console.
5. The app installs (Add to home screen).

Locally, the same scripts run with `PUBLIC_HOST=oleoziza.localhost`. Caddy then uses its own local CA, and the check trusts it. Import `/data/caddy/pki/authorities/local/root.crt` from `oleoziza_caddy_production` into the browser to open the site. Avoid `localhost` itself: the HSTS header would push the dev stack's ports onto HTTPS. Stop it with `docker compose -f docker-compose-deploy.yml --env-file env_files/production/docker.env down`, which keeps the volumes.

**Backups.** `oleoziza_db_dump` keeps one dump at `backups/oleoziza.dump` (root-only). It writes one at its first start, then every night at 03:00 Morocco time. Each dump goes to a temporary file first, so a failed night keeps the previous one. VM snapshots then hold a dated copy of that file. `scripts/production-restore.sh [file in backups/]` replaces the database with a dump after typing `yes`; the backend's migrations bring an older dump up to date.

**Resetting test data.** `scripts/reset-data.sh` empties chosen business modules (Charges, Lots and oil, Finances, Clients, Configuration, Seasons, Journal, staff Users), with whatever depends on them: it dumps the database first, lists what goes and asks to type a word. Owners, Sites and reference data stay.
