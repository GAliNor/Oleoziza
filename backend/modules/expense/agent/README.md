# Expense

## Business
Money a [Site](../../../../GLOSSARY.md) already paid to run, stock or equip itself ([Expense](../../../../GLOSSARY.md), « Charge »), filed under an [Expense Category](../../../../GLOSSARY.md), paid to a [Supplier](../../../../GLOSSARY.md) and proved by [Expense Documents](../../../../GLOSSARY.md). Feeds the register exported for the accountant and the [Result](../../../../GLOSSARY.md) on the Dashboard.

## Exposes
- Endpoints: none yet (the `expense` plug adds them).
- Models: Expense, Supplier, ExpenseCategory, ExpenseDocument.

## Refusal codes
None yet.

## Rules and gotchas
- An Expense points at a sub-category only; its category is derived. Categories are seeded by `python -m seeds reference` (89 rows, slug ids, suggested CGNC account, TVA nature), retired never deleted; labels live in the front locales.
- Amount is TTC; HT and TVA are derived (`vat = TTC × rate / (100 + rate)`), never stored. TVA rate is 0, 10, 20 or empty.
- Code `<Site>-C<Season>-<seq>` from the Code Sequence kind `expense`; the Season is the one open on the Expense's date.
- Cancelled, never deleted: `cancel_reason` and `cancelled_at` are required.
- Supplier names are unique ignoring case (index on `lower(name)`); accents are not folded yet.
- The Python attribute `date` shadows the `date` type in the model, so the type is imported as `CalendarDate`.
