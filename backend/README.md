# Oleoziza backend

FastAPI API, laid out like the Maroc Voyages backend and following the fastapi-backend-style conventions: `core/` holds the settings, database and app wiring, and `modules/<business>/` holds one business each (`routes/`, `services/`, `types/`, `models/`…). Route files named `*_routes.py` mount on their own under `/api/<module-name>`.

| Path | What it holds |
| --- | --- |
| `main.py` | App creation: models, CORS, exception handlers, routers |
| `core/` | `config` (settings from the environment), `database` (engine, `Base`, `get_db`), `app_init` (model and router discovery, CORS, error answers), `security` (ES256 tokens, `get_current_user`), `model_mixins` (shared columns) |
| `core/integrations/celery/` | Celery app on Redis (task modules discovered from `modules/*/tasks/*_tasks.py`) and `publish_task`, which never fails a request when the broker is down |
| `modules/auth/` | Stateless login: `login-options`, `login` (phone + PIN, email + password), `refresh`, `logout`, credential change (current secret required unless forced) and skip; Invitations (`invitations/{token}`, `accept`) sent by the `auth.send_invitation` task |
| `modules/site/` | Seasons at `/api/site/seasons`: list, prepare the next one (prices carried over), open, close, and upload its banners to RustFS (`PUT …/{id}/illustration?variant=light\|dark`) |
| `modules/configuration/` | `GET/PATCH /api/configuration/{site_id}` (`?seasonId=` for another Season): prices with their dated and scheduled changes, cancel a scheduled one (`DELETE …/price-changes/{id}`), Payment Methods, Boxes, Tanks, Press Lines; each change is an Audit Event, which is also the page's history |
| `modules/user/` | `/api/user`: staff list, creation (first secret or Invitation), Permissions per Site, login methods, status, invitation, reset |
| `core/integrations/mail/`, `core/integrations/sms/` | SMTP client (MailHog in development) and a simulated SMS gateway that writes each SMS to the worker log |
| `modules/<business>/models/` | The SQLAlchemy models of the [data model](../docs/data-model.md) |
| `modules/health/` | `GET /api/health`, and the `health.ping` task |
| `seeds/` | `python -m seeds reference` (Provinces with their outlines from `seeds/fixtures/oriental-provinces.json`, towns, olive varieties), `demo` (Oujda, the open 2026-2027 Season, Oujda's Configuration with the front mock's Tank and Press Line ids, and the Owner; refused in production), `owner` (first Owner from `SEED_OWNER_*`) |
| `alembic/` | Migrations (`alembic revision --autogenerate -m "..."`, `alembic upgrade head`) |
| `tests/` | pytest, mirroring the source tree; auth tests run on the dev database inside a rolled-back transaction and skip when it is unreachable |

## Auth

- **Stateless.** The access token (15 min) is an ES256 JWT carrying the Role, the Owner flag and the Permissions per Site; it is trusted on its signature alone. The front verifies it with the public half of the key (`VITE_AUTH_PUBLIC_JWK`).
- **Refresh.** The refresh token (30 days, rotated on every refresh) lives in an httpOnly, SameSite=strict cookie named `refresh_token_<user id>`, so Operators sharing a phone each keep their own. The front sends the user id to `/refresh` and `/logout`.
- **Revocation.** A refresh token carries the User's `token_version`; changing a credential (or, later, disabling a User) bumps it and every older refresh token is refused. One device cannot be revoked alone: that is the trade-off of having no session table.
- **Keys.** Generate a key pair per deployment and put the private half in `AUTH_PRIVATE_JWK`, the public half in the front's `VITE_AUTH_PUBLIC_JWK`:

```bash
docker compose exec oleoziza_backend python -c "from cryptography.hazmat.primitives.asymmetric import ec; from jwt.algorithms import ECAlgorithm; key = ec.generate_private_key(ec.SECP256R1()); print('AUTH_PRIVATE_JWK=' + ECAlgorithm.to_jwk(key)); print('VITE_AUTH_PUBLIC_JWK=' + ECAlgorithm.to_jwk(key.public_key()))"
```

## Running

Dependencies are managed with [uv](https://docs.astral.sh/uv/) (Python 3.12). The settings come from the environment or `backend/.env` (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_NAME`, see `env_files/<env>/backend.env`).

```bash
uv sync
uv run pytest
uv run uvicorn main:app --reload
```
