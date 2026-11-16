# Client

## Business
The mill's [Clients](../../../../GLOSSARY.md) (Individuals and Companies) shared by every Site, with their [Client Contacts](../../../../GLOSSARY.md) and their Location in the Oriental. Balances, Oil Stock and the follow-up tag are derived, never stored.

## Exposes
- Endpoints (`/api/client/clients`):
  - `GET ""` (any staff): every active Client with the Sites they came to; light, for the Operator's picker and search.
  - `GET /records` (`client.view`): Management's register with figures per Site and each Client's Lots (one query for all Lots).
  - `POST ""` (`client.create` or `reception.create` on the Site): create; a replay of the same id answers the stored Client (outbox-safe), audited once.
  - `GET /{id}/account`: what the Client holds and owes now, with the open Season's Lots.
  - `GET /{id}/history?siteId=`: their Lots on one Site.
  - `PATCH /{id}/contact` (`client.edit`): phone or email, audited.
- Services: `ClientService`. Business: `list_lot_lines` (Lots of many Clients in one query), `get_follow_up`.

## Refusal codes
- `client_not_found` (404); `clients_forbidden` (403).
- `names_required`, `identifier_invalid`, `province_not_found` (422).

## Rules and gotchas
- An Individual needs first and last names, a Company its legal name. CIN: 1–2 letters then digits; ICE: 15 digits; another Client with the same number only warns (front).
- Balance, Oil Stock and `creditDh` read 0 until the finance and oil plugs compute them; `followUp` is at-risk with a balance due, active with a Lot in the open Season, inactive otherwise.
- Created offline by Operators: `entered_at`, `was_recorded_offline`, `device_label` come with the payload.
- CIN and ICE are `national_id_number` and `company_identifier`; titles are English enum values.
