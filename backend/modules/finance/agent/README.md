# Finance

## Business
Money between the mill and its [Clients](../../../../GLOSSARY.md): [Discounts](../../../../GLOSSARY.md) on a Lot's [Milling Fee](../../../../GLOSSARY.md), [Payments](../../../../GLOSSARY.md) split over Lots by Payment Allocations and proved by Payment Proofs, [Credit Notes](../../../../GLOSSARY.md) and their Uses, [Refunds](../../../../GLOSSARY.md), and Debt Contacts when chasing a balance.

## Exposes
- Endpoints (`/api/finance`):
  - `GET /payments?siteId=` (open Season), `GET /payments/page?list=pending|all&search=&period=&offset=&limit=` → `{items, total}`.
  - `POST /payments` (`payment.record`): idempotent on the id; cash recorded by someone with `payment.confirm` is confirmed at once, anything else pending; Proofs as data URLs go to the private bucket.
  - `POST /payments/{id}/decision`: confirm or reject a pending one (`payment.confirm`; needs Allocations; a surplus needs a settlement), cancel a confirmed one (`payment.cancel`; optional settlement). Settlement: Credit Note or Refund (code R).
  - `PUT /payments/{id}/lots`, `POST /payments/{id}/documents` (`document.add`).
  - `GET /refunds`, `GET /refunds/page`, `POST /refunds/{id}/made`, `POST /refunds/{id}/confirm` (`refund.manage`; never by its maker).
  - `GET|POST /debt-contacts` (`debt.follow`; POST idempotent).
  - `GET /sales?siteId=&period=`: figures (revenue = collected + pending + outstanding over the period's Lots), day or week buckets, methods.
  - Discounts through `/api/lot/lots/{id}/discount` (`DiscountService`).
  - Rate Corrections through `POST /api/lot/lots/{id}/rate` (`lot.set_price`, `RateCorrectionService`): a new Milling Rate with a required reason, kept as a `RateCorrection` row (old rate, new rate, reason, who) and an Audit Event `lot.rate_corrected`.
- Services: `PaymentService`, `FinanceDeskService` (Refunds, Debt Contacts, sales), `DiscountService`, `RateCorrectionService`.
- Business: `check_rate_correction` (`business/rate_correction.py`).
- Business: `get_fees`, `get_amounts_due`, `list_client_debts` (the debt per Client in one SQL query, for the Tasks list; keep its formula in step with `get_amounts_due`) (`lot_fees.py`), `get_open_credits`, `get_lot_credits`, `use_open_credit` (`client_credit.py`, used at Reception), `build_movement_views`, `build_refund_views`.

## Refusal codes
- `payment_not_found`, `refund_not_found`, `client_not_found` (404); `payments_forbidden`, `refunds_forbidden`, `debts_forbidden`, `refund_own`, `discounts_forbidden`, `discount_own` (403).
- `movement_not_decidable`, `movement_not_linked`, `movement_not_pending`, `refund_not_to_make`, `refund_not_made`, `season_not_open`, `discount_already_given`, `discount_not_pending` (409).
- `surplus_not_settled`, `links_too_high`, `lot_not_payable`, `oil_litres_required`, `method_invalid`, `document_invalid`, `discount_too_high`, `reason_required` (422).

## Rules and gotchas
- A rate correction applies until the Lot is paid (`lot_already_paid`); the new fee never drops below what is paid or pending (`rate_below_paid`), nor the full fee below a Discount not refused (`rate_below_discount`), which keeps its DH amount. Other codes: `rates_forbidden` (403), `reason_required`, `rate_unchanged`, `rate_not_applicable` (422).
- The Milling Fee, a Lot's Payment State and a Client's balance are derived, never stored. A pending Discount counts at full price.
- Credit Notes are used on the Site that issued them, oldest first, automatically at the next Service Milling Reception.
- `payment_services.py` and `finance_desk_services.py` sit at the 300-line flag: split the sales into their own service when next touched.
- Payment-confirmed Notifications aren't sent yet (the « pressed » one is).
