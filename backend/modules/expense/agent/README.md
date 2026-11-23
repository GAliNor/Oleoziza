# Expense

## Business
Money a [Site](../../../../GLOSSARY.md) has to pay, then has paid, to run, stock or equip itself ([Expense](../../../../GLOSSARY.md), « Charge »; a [Recurring Expense](../../../../GLOSSARY.md) comes back), filed under an [Expense Category](../../../../GLOSSARY.md), optionally paid to a [Supplier](../../../../GLOSSARY.md) and proved by [Expense Documents](../../../../GLOSSARY.md). Feeds the register exported for the accountant and the [Result](../../../../GLOSSARY.md) on the Dashboard.

## Exposes
- Endpoints (`/api/expense`, « Gérer les charges » = `expense.record` for writes):
  - `GET /categories` (reference, cached a day).
  - `GET /expenses?siteId=&period=&category=&search=&paymentState=&offset=&limit=` → `{items, total}`: `paid` in the period, or every `to_pay` by due date. `GET /expenses/summary?siteId=&period=` → totals, `byCategory`, `bySubcategory` (paid only) and `toPay` (count, amount, late, without amount, whatever the period); `GET /expenses/export?siteId=&from=&to=` (paid only); `GET /expenses/{id}`.
  - `POST /expenses` (idempotent on the id; to pay or paid, with an optional `frequency`), `PUT /expenses/{id}` (never changes the payment state; a `frequency` starts or changes the recurrence, none leaves it), `POST /{id}/pay`, `POST /{id}/unpay`, `POST /{id}/cancel` (paid, with a reason), `DELETE /{id}` (to pay only; a recurring one skips to the next), `POST /{id}/stop-recurrence` (answers null when the occurrence asked from is the one removed).
  - `GET /suppliers`, `POST /suppliers` (an existing name gives back that Supplier).
- Services: `ExpenseService`, `ExpensePaymentService` and `RecurrenceScheduleService` (`expense_payment_services.py`), `SupplierService`. Task `expense.create_due_recurrences`, hourly (the worker runs with `--beat`).
- Business: `build_expense_views`, `list_due_expenses` (the alerts, read by `task`), `sum_to_pay`, `recurrences.py`, `expense_rules.py` (what each state requires, and the Season a payment counts in).
- Models: Expense, RecurringExpense, Supplier, ExpenseCategory, ExpenseDocument.

## Refusal codes
- `expense_not_found` (404); `expenses_forbidden`, `site_forbidden` (403).
- `expense_cancelled`, `expense_already_paid`, `expense_not_paid`, `expense_not_recurring`, `season_missing`, `season_closed` (409).
- `category_invalid`, `vat_rate_invalid`, `ice_invalid`, `date_in_future`, `due_date_required`, `payment_incomplete`, `document_invalid` (422).

## Rules and gotchas
- An Expense points at a sub-category only; its category is derived. Categories are seeded by `python -m seeds reference` (89 rows, slug ids, suggested CGNC account, TVA nature), retired never deleted; labels live in the front locales.
- Amount is TTC; HT and TVA are derived (`vat = TTC × rate / (100 + rate)`), never stored. TVA rate is 0, 10, 20 or empty.
- Code `<Site>-C<Season>-<seq>` from the Code Sequence kind `expense`, given when first paid and kept afterwards; the Season is the one its payment date counts in (`get_season_of_day`), off-season days included.
- Paying locks the recurrence row (`FOR UPDATE`) and `(recurring_expense_id, occurrence_on)` is unique, so two payments at once, or the hourly task, never create one occurrence twice.
- A closed Season locks what was paid before the day it closed; an Expense to pay is never locked.
- A paid one is cancelled, never deleted: `cancel_reason` and `cancelled_at` are required.
- Supplier names are unique ignoring case (index on `lower(name)`); accents are not folded yet.
- The Python attribute `date` shadows the `date` type in the model, so the type is imported as `CalendarDate`.
- The export is JSON (the front builds the French CSV); the .xlsx and the documents .zip, and the per-supplier daily/monthly cash totals, are still to come.
