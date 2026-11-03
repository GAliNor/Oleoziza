# Oleoziza backend

FastAPI API, laid out like the Maroc Voyages backend and following the fastapi-backend-style conventions: `core/` holds the settings, database and app wiring, and `modules/<business>/` holds one business each (`routes/`, `services/`, `types/`, `models/`…). Route files named `*_routes.py` mount on their own under `/api/<module-name>`.

| Path | What it holds |
| --- | --- |
| `main.py` | App creation: models, CORS, routers |
| `core/` | `config` (settings from the environment), `database` (engine, `Base`, `get_db`), `app_init` (model and router discovery, CORS), `model_mixins` (shared columns) |
| `modules/health/` | `GET /api/health`: API status and database reachability |
| `alembic/` | Migrations (`alembic revision --autogenerate -m "..."`, `alembic upgrade head`) |
| `tests/` | pytest, mirroring the source tree |

## Running

Dependencies are managed with [uv](https://docs.astral.sh/uv/) (Python 3.12). The settings come from the environment or `backend/.env` (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_NAME`, see `env_files/<env>/backend.env`).

```bash
uv sync
uv run pytest
uv run uvicorn main:app --reload
```
