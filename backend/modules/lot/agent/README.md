# Lot

## Business
A Client's olives from [Reception](../../../../GLOSSARY.md) to oil: the [Lot](../../../../GLOSSARY.md) with its weighing and Pressing attributes, the [Boxes](../../../../GLOSSARY.md) it occupies (Box Occupancy), Pressing Pauses, Lot Photos and the Notifications sent about it.

## Exposes
- Endpoints (`/api/lot/lots`):
  - `GET ""?siteId=…&seasonId=` (Sites held): the Lots of one Season (open by default), newest first.
  - `POST ""` (`reception.create`): one Reception becomes a waiting Lot in its Boxes, on a Press Line's queue; a replay of the same id answers the stored Lot (outbox-safe).
  - `GET /{id}`: one Lot.
- Services: `LotService` (`list_lots`, `get_lot`, `receive_lot`, `get_lot_row`).
- Business: `build_lot_views(db, lots)`: the screen shape of many Lots in a fixed number of queries (Clients, varieties, Boxes, Storages and draws, Withdrawals, Discounts, Notifications, Allocations, User names).

## Refusal codes
- `lot_not_found`, `client_not_found` (404); `lots_forbidden`, `site_forbidden` (403).
- `season_not_open`, `box_taken` (409); `variety_not_found`, `press_line_not_found`, `box_not_found` (422).

## Rules and gotchas
- The code comes from `give_next_code` (`site/business/code_sequences.py`), `<Site>-<Season>-<0001>`, locked per Site, Season and kind.
- One open Box Occupancy per Box (partial unique index); a Reception into a full Box is refused.
- The variety is accepted by slug or name; the suggested milling rate is the price in force (`ConfigurationService.get_price_in_force`).
- `moves` are derived from the Lot's timestamps and its latest Withdrawal; `isContactMissing` from the chosen channel and the Client's contacts; `creditDh` reads 0 until Credit Notes are served.
- Written offline: `entered_at`, `was_recorded_offline`, `device_label` come with the payload.
