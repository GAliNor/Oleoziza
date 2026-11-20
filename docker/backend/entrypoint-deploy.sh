#!/bin/sh
set -e

alembic upgrade head
python -m core.integrations.rustfs

exec uvicorn main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
