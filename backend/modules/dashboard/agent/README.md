# Dashboard

## Business
The Management Home in one request: production of the period, the Season against the previous one, varieties, [Press Lines](../../../../GLOSSARY.md), the olives chart, [Tanks](../../../../GLOSSARY.md) and each [Site](../../../../GLOSSARY.md)'s day; for those who see the finances, the sales figures and the [Expense](../../../../GLOSSARY.md) summary too. Read-only and derived: nothing is stored.

## Exposes
- Endpoints: `GET /api/dashboard?siteId=&period=` (Sites held; no siteId = every Site): `DashboardOut`; `sales` and `expenseSummary` only with `finance.view` on every Site in scope.
- Services: `DashboardService.get_dashboard` (calls `FinanceDeskService.get_sales` and `ExpenseService.get_summary`).

## Refusal codes
- `site_not_found` (404), `site_forbidden` (403), from `resolve_site_ids`.

## Rules and gotchas
- The Lots of this and the previous Season are read in one query and every figure is computed from them; Tanks in three queries. Season deltas compare with the previous Season over as many days.
- Labels stay in the front: buckets carry dates, Tanks and Press Lines their numbers.
