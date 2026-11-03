# Oleoziza

Management of one owner's olive oil mills: Receptions, Weighings, Pressings, Client accounts, Payments and stock, across several Sites.

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

Backend deps are managed with uv (`uv add --bounds exact <pkg>`, then rebuild). Run Alembic and the tests inside the container: `docker compose exec oleoziza_backend alembic revision --autogenerate -m "..."`, `docker compose exec oleoziza_backend pytest`.

`docker-compose-deploy.yml` runs the registry image (`<REGISTRY>` and `<APP_VERSION>` are filled in at deploy).
