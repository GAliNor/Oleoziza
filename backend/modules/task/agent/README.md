# Task

## Business
Management's to-do list: what waits on the signed-in person, read from the records it comes from (pending Discounts and Payments, Refunds to make or confirm, Clients who owe, staff still invited). A task disappears once its record is settled. Read-only.

## Exposes
- Endpoints: `GET /api/task/tasks?siteId=` (no siteId = every Site held): each kind only on the Sites where the caller holds its Permission (`discount.approve`, `payment.confirm`, `refund.manage`, `client.view`, `user.manage`), oldest first; `targetId` is the record the front links to.
- Services: `TaskService.list_tasks`.

## Refusal codes
- `site_not_found` (404), `site_forbidden` (403), from `resolve_site_ids`.

## Rules and gotchas
- A Refund made by the caller isn't their task: someone else confirms it.
- « Client who owes » comes from `list_client_debts`: one SQL aggregate over every Season's Lots on the Sites in scope, with the same figures as `get_amounts_due` summed per Client (checked equal on 108,000 Lots).
