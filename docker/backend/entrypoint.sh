#!/bin/sh
set -e

alembic upgrade head
python -m core.integrations.rustfs

exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
