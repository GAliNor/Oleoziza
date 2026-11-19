# Expense

## Business
Money a [Site](../../../../GLOSSARY.md) already paid to run, stock or equip itself ([Expense](../../../../GLOSSARY.md), « Charge »), filed under an [Expense Category](../../../../GLOSSARY.md), paid to a [Supplier](../../../../GLOSSARY.md) and proved by [Expense Documents](../../../../GLOSSARY.md). Feeds the register exported for the accountant and the [Result](../../../../GLOSSARY.md) on the Dashboard.

## Exposes
- Endpoints (`/api/expense`, « Gérer les charges » = `expense.record` for writes):
  - `GET /categories` (reference, cached a day).
  - `GET /expenses?siteId=&period=&category=&search=&offset=&limit=` → `{items, total}`; `GET /expenses/summary?siteId=&period=` → totals, `byCategory` and `bySubcategory` (amount, TVA, count per sub-category with its `parentId`), built in `business/expense_summary.py`; `GET /expenses/export?siteId=&from=&to=`; `GET /expenses/{id}`.
  - `POST /expenses` (idempotent on the id; code `<Site>-C<Season>-…`; Supplier created from a typed name), `PUT /expenses/{id}`, `POST /expenses/{id}/cancel` (reason; repeat answers it as it is).
  - `GET /suppliers`, `POST /suppliers` (an existing name gives back that Supplier).
- Services: `ExpenseService`. Business: `build_expense_views`.
- Models: Expense, Supplier, ExpenseCategory, ExpenseDocument.

## Refusal codes
- `expense_not_found` (404); `expenses_forbidden`, `site_forbidden` (403).
- `expense_cancelled`, `season_not_open`, `season_closed` (409).
- `category_invalid`, `vat_rate_invalid`, `ice_invalid`, `date_in_future`, `document_invalid` (422).

## Rules and gotchas
- An Expense points at a sub-category only; its category is derived. Categories are seeded by `python -m seeds reference` (89 rows, slug ids, suggested CGNC account, TVA nature), retired never deleted; labels live in the front locales.
- Amount is TTC; HT and TVA are derived (`vat = TTC × rate / (100 + rate)`), never stored. TVA rate is 0, 10, 20 or empty.
- Code `<Site>-C<Season>-<seq>` from the Code Sequence kind `expense`; the Season is the one open on the Expense's date.
- Cancelled, never deleted: `cancel_reason` and `cancelled_at` are required.
- Supplier names are unique ignoring case (index on `lower(name)`); accents are not folded yet.
- The Python attribute `date` shadows the `date` type in the model, so the type is imported as `CalendarDate`.
- The export is JSON (the front builds the French CSV); the .xlsx and the documents .zip, and the per-supplier daily/monthly cash totals, are still to come.
