# Audit

## Business
The [Audit Trail](../../../../GLOSSARY.md): one [Audit Event](../../../../GLOSSARY.md) per change (who, what, when, which Site, before and after), written in the same transaction as the change and never edited. The Journal and every record's history read from it.

## Exposes
- Endpoints (`/api/audit/journal`, `audit_trail.view` or `dashboard.view` on the Site): `GET /summary?siteId=&day=` (the day at a glance), `GET ?siteId=&day=&group=&person=&offset=&limit=` (`{items, total}`). Money events (Discounts, Payments, Refunds, Expenses, debt follow-up) only with `finance.view`.
- Services: `JournalService`. Business: `build_day_feed` (the day's Audit Events and Storages told as business events, the records they point at read in batch).
- Business: `record_audit_event(db, actor_id, action, site_id, entity_type, entity_id, before, after, event_id)`: every module's writes call it; `event_id` is the front's id so a retried request isn't recorded twice.

## Refusal codes
- `journal_forbidden` (403).

## Rules and gotchas
- `action` is a dotted English verb: `configuration.value_set`, `expense.cancelled`…
- Offline writes carry `was_recorded_offline` and `device_label`; `occurred_at` is when it happened, `recorded_at` when the server got it.
- Snapshots (`before`/`after`) are the one place JSON columns are allowed.
- Model: AuditEvent.
- The Journal maps actions to kinds in `business/journal_feed.py`: a new action a module records shows in the Journal only once it is mapped there.
