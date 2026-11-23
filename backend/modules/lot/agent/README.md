# Lot

## Business
A Client's olives from [Reception](../../../../GLOSSARY.md) to oil: the [Lot](../../../../GLOSSARY.md) with its weighing and Pressing attributes, the [Boxes](../../../../GLOSSARY.md) it occupies (Box Occupancy), Pressing Pauses, Lot Photos and the Notifications sent about it.

## Exposes
- Endpoints (`/api/lot/lots`):
  - `GET ""?siteId=…&seasonId=` (Sites held): the Lots of one Season (open by default), newest first.
  - `POST ""` (`reception.create`): one Reception becomes a waiting Lot in its Boxes, on a Press Line's queue; a replay of the same id answers the stored Lot (outbox-safe). The Boxes must hold the net weight (`box_capacity_short`) unless `areBoxesIgnored`, which also allows no Box at all.
  - `GET /without-line?siteId=&offset=&limit=` → `{items, total}`: waiting Lots with no Press Line, oldest first.
  - `GET /{id}`: one Lot. `GET /{id}/photos`: signed URLs of its photos by step (`LotOut.photoSteps` says which exist).
  - `POST /{id}/moves` (`pressing.create` or `lot.update_status`): one step. Waiting → pressing (frees the Boxes; `line_busy` when another Lot presses on the Line); pressing → pressed (`oilLitres`, `handedLitres` handed at once as a Withdrawal, `pours` into Tanks as Storages, `plannedUntil`; nothing stored means withdrawn at once; the « pressed » Notification: `failed` with `channel_disabled` when its channel is off for the company or `contact_missing`, else `queued` for an email (sent by the `lot.send_notification` task after commit: `sent`, or `failed` with the mail error after 5 retries) and `simulated` for the others); pressed → withdrawn (draws what is left). Keyed by its Audit Event id.
  - `PUT /{id}/schedule`: a Line and start while waiting, the first ones included.
  - `POST /{id}/discount`, `POST /{id}/discount/decision`: served by `finance`'s `DiscountService`.
  - `POST /{id}/rate` (`lot.set_price`): a Milling Rate correction with its reason, served by `finance`'s `RateCorrectionService`; `LotOut.rateCorrections` lists them oldest first (`business/lot_rate_views.py`).
  - `POST /{id}/contact-found`: reads the Lot again (the flag is derived).
- Services: `LotService` (`list_lots`, `get_lot`, `receive_lot`, `get_lot_row`), `LotMoveService` (`move_lot`, `schedule_lot`).
- Business: `build_lot_views(db, lots)`: the screen shape of many Lots in a fixed number of queries (Clients, varieties, Boxes, Storages and draws, Withdrawals, Discounts, Notifications, Allocations, User names).

## Refusal codes
- `lot_not_found`, `client_not_found` (404); `lots_forbidden`, `site_forbidden` (403).
- `season_not_open`, `box_taken`, `line_busy`, `lot_already_pressing`, `lot_already_withdrawn`, `tank_full` (409); `variety_not_found`, `press_line_not_found`, `box_not_found`, `box_capacity_short`, `lot_without_line`, `oil_required`, `oil_split_invalid`, `tank_not_found` (422).
- Discounts (finance): `discounts_forbidden`, `discount_own` (403); `discount_already_given`, `discount_not_pending` (409); `discount_too_high`, `reason_required` (422).

## Rules and gotchas
- The code comes from `give_next_code` (`site/business/code_sequences.py`), `<Site>-<Season>-<0001>`, locked per Site, Season and kind.
- One open Box Occupancy per Box (partial unique index); a Reception into a full Box is refused.
- The variety is accepted by slug or name; the suggested milling rate is the price in force (`ConfigurationService.get_price_in_force`).
- `moves` are derived from the Lot's timestamps and its latest Withdrawal; `isContactMissing` from the chosen channel and the Client's contacts; `creditDh` reads 0 until Credit Notes are served.
- Written offline: `entered_at`, `was_recorded_offline`, `device_label` come with the payload.
- « Plus tard »: `press_line_id` and `planned_start_at` are both empty or both set (check constraint); starting the Pressing then needs a Line (`lot_without_line`).
- A photo travels with the Reception or the move (`photoUrl`, `business/lot_photos.py`): one that can't be kept never refuses the Lot.
