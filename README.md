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
# dev: frontend, backend, postgres, pgadmin and mailhog on one network, with hot reload
docker compose up -d --build

# production images: nginx serving the front build (VITE_* baked in from env_files/<env>/frontend.env), and the API
docker build --build-arg CURRENT_ENV=production -f docker/frontend/Dockerfile-deploy -t oleoziza-frontend .
docker build -f docker/backend/Dockerfile-deploy -t oleoziza-backend .
```

| Service | URL | Notes |
| --- | --- | --- |
| Frontend (Vite) | http://localhost:32501 | |
| Backend (FastAPI) | http://localhost:32551 | docs at `/docs`, health at `/api/health`; runs `alembic upgrade head` on start |
| Postgres 16.2 | `localhost:32509` | db `oleoziza`, user/password `root`/`root`; host `oleoziza_db_backend` inside the network |
| pgAdmin | http://localhost:32520 | desktop mode, no login |
| MailHog | http://localhost:32586 | backend sends to `oleoziza_mailhog:1025` |
| Redis | inside the network only | Celery broker (DB 0) and results (DB 1), host `oleoziza_redis` |
| Celery worker | — | `oleoziza_worker`, reloads on Python changes |
| Flower | http://localhost:32555 | Celery monitoring, login `admin` / `admin` (`FLOWER_BASIC_AUTH`) |

First start, after `docker compose up -d --build` (the backend runs `alembic upgrade head` on start):

```bash
docker compose exec oleoziza_backend python -m seeds reference   # Provinces, towns, olive varieties, Expense Categories
docker compose exec oleoziza_backend python -m seeds demo        # dev only: Oujda, the open Season, its Configuration and the Owner (m.taibi@oleoziza.ma / Oleoziza2026, or 0661100001 + PIN 1234)
```

The front's `VITE_API_MODULES` (in `env_files/<env>/frontend.env`) lists the modules served by the backend; `auth`, `configuration`, `season` and `user` are plugged, the rest stays on mocks. Every other User is created from the Users page: with a first password (default) or an Invitation, whose email lands in MailHog and whose SMS is written to the worker log (`docker compose logs oleoziza_worker`). In production, create the first Owner with `python -m seeds owner` (`SEED_OWNER_*` settings).

Backend deps are managed with uv (`uv add --bounds exact <pkg>`, then rebuild). Run Alembic and the tests inside the container: `docker compose exec oleoziza_backend alembic revision --autogenerate -m "..."`, `docker compose exec oleoziza_backend pytest`.

### RustFS

`rustfs/.env` links to `env_files/development/rustfs.env`. It joins the main stack's network, so start the main stack first:

```bash
cd rustfs && docker compose up -d
```

S3 API on http://localhost:32590 (`http://oleoziza-rustfs:9000` from the backend), console on http://localhost:32591/rustfs/console/ (login with `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY`).

The backend uses it through `core/integrations/rustfs/rustfs_client.py`. It needs two buckets, created from the console: `RUSTFS_PRIVATE_BUCKET` (`oleoziza-private`: Payment Proofs, served through signed URLs) and `RUSTFS_PUBLIC_BUCKET` (`oleoziza-public`: Season banners and future images, set to public read, i.e. a bucket policy allowing anonymous `s3:GetObject`). `RUSTFS_PUBLIC_ENDPOINT_URL` is the address browsers use to open files.

`docker-compose-deploy.yml` runs the registry image (`<REGISTRY>` and `<APP_VERSION>` are filled in at deploy).
