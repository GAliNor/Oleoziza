# Health

## Business
Tells Docker and the front whether the API is up and can reach its database. No business data.

## Exposes
- Endpoints: `GET /api/health` (public): `ok` when the database answers.
- Tasks: `health.ping`: returns `pong`, to check the Celery worker.

## Refusal codes
None.

## Rules and gotchas
None.
