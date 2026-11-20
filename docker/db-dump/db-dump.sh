#!/bin/sh
# Keeps one dump of the database in /backups/oleoziza.dump, written to a temporary file and renamed only once pg_dump
# succeeds, so a failed night never erases the last good dump. Dumps at start when none exists, then every night at
# DUMP_HOUR (Morocco time); --once dumps now and exits.
set -eu

DUMP_FILE=/backups/oleoziza.dump

dump() {
  partial="$DUMP_FILE.partial"
  if PGPASSWORD="$DB_PASSWORD" pg_dump -h oleoziza_db_backend -U "$DB_USERNAME" -d "$DB_DATABASE" --format=custom --file="$partial"; then
    chmod 600 "$partial"
    mv "$partial" "$DUMP_FILE"
    echo "$(date -Iseconds) dump written: $(du -h "$DUMP_FILE" | cut -f1)"
  else
    rm -f "$partial"
    echo "$(date -Iseconds) dump FAILED, the previous one is kept" >&2
  fi
}

seconds_until_dump_hour() {
  target=$(date -d "today $DUMP_HOUR:00" +%s)
  now=$(date +%s)
  [ "$target" -gt "$now" ] || target=$(date -d "tomorrow $DUMP_HOUR:00" +%s)
  echo $((target - now))
}

umask 077
if [ "${1:-}" = "--once" ]; then
  dump
  exit 0
fi
[ -f "$DUMP_FILE" ] || dump
while true; do
  sleep "$(seconds_until_dump_hour)"
  dump
done
