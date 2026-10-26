# Oleoziza

Management of one owner's olive oil mills: Receptions, Weighings, Pressings, Client accounts, Payments and stock, across several Sites.

## Repository

| Folder | What it holds |
| --- | --- |
| [frontend/](frontend/) | Vue 3 PWA (front MVP, mock services for now). See its [README](frontend/README.md). |
| `backend/` | To come. |
| [docker/](docker/), [env_files/](env_files/), [config/](config/) | Dockerfiles, per-environment variables, nginx config. |
| [docs/](docs/) | Inspiration and reference material. |
| [.wayfinder/](.wayfinder/map.md) | Planning map and decision tickets. |

Domain vocabulary is in [GLOSSARY.md](GLOSSARY.md).

## Docker

`.env` links to `env_files/development/docker.env`.

```bash
# dev: Vite with hot reload on http://localhost:32501
docker compose up -d --build

# production image: nginx serving the build, VITE_* baked in from env_files/<env>/frontend.env
docker build --build-arg CURRENT_ENV=production -f docker/frontend/Dockerfile-deploy -t oleoziza-frontend .
```

`docker-compose-deploy.yml` runs the registry image (`<REGISTRY>` and `<APP_VERSION>` are filled in at deploy).
