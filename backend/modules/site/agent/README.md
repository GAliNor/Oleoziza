# Site

## Business
The mills ([Sites](../../../../GLOSSARY.md)) of one owner, the harvest [Seasons](../../../../GLOSSARY.md) (November to January, one open at a time) and the [Code Sequences](../../../../GLOSSARY.md) that number Lots, Payments, Refunds, Withdrawals and Expenses per Site and Season.

## Exposes
- Endpoints (`/api/site`):
  - `GET /sites`: the Sites the caller holds (every one for the Owner), by code.
  - `POST /sites` (Owner): open a Site with its two-letter code, name, Location and phone.
  - `PUT /sites/{id}` (`site.manage` on it): change name, Location, phone; never the code.
  - `DELETE /sites/{id}` (Owner): only a Site nothing points at yet.
  - `GET /seasons`: every Season, oldest first.
  - `POST /seasons`: prepare the next Season (status `planned`), prices carried over. `season.manage`.
  - `POST /seasons/{id}/open`, `POST /seasons/{id}/close`: opening closes the one under way.
  - `PUT /seasons/{id}/dates` `{startsOn, endsOn}` (`season.manage`): a prepared or open Season; its first prices and the Expenses paid around its first day follow.
  - `POST /seasons/{id}/reopen` (Owner): the latest closed Season, while no other is open. `DELETE /seasons/{id}` (Owner): a Season holding no Lot, Payment, Expense or Credit Note, with its prices.
  - `POST /seasons` takes an optional body `{seasonIllustrationId}`: the new Season uses that [Season Illustration](../../../../GLOSSARY.md).
  - `PUT /seasons/{id}/season-illustration` (`season.manage`): `{seasonIllustrationId}` picks one, `null` drops it.
  - `GET /season-illustrations` (any signed-in User): the available Season Illustrations, newest code first, each with `illustrationUrl` and `illustrationDarkUrl`.
  - `PUT /seasons/{id}/illustration?variant=light|dark`: unused by the front since the picker. Uploads one picture into the Season Illustration named after the Season's code (created with that picture as both versions when missing) and makes the Season use it.
- Services: `SiteService` (list, create, update, delete), `SeasonService` (list, prepare, open, close, choose_illustration, upload), `SeasonDateService` (set_dates), `SeasonCorrectionService` (reopen, delete), `SeasonIllustrationService` (list).
- Business: `resolve_site_ids(db, current_user, requested)`: the repeated `siteId` rule every module's collections use (none = every Site held); `season_art`: `store_illustration_image`, `store_season_illustration`, `read_season_illustrations` (one query, URLs built from the two Files).

## Refusal codes
- `site_not_found`, `season_not_found`, `season_illustration_not_found` (404); `sites_forbidden`, `site_forbidden`, `season_forbidden` (403).
- `code_taken`, `site_has_records` (409); `province_not_found` (422).
- `season_dates_reversed`, `season_starts_in_future` (422), `season_dates_overlap`, `season_closed` (409): dates.
- `season_already_planned`, `season_not_planned`, `season_not_open` (409).
- `too_large` (413), `unsupported_type` (415): banner upload.

## Rules and gotchas
- A Season is named after its harvest (`get_harvest_year`), not the calendar year of the day it was moved to.
- One open Season and one planned Season at most, held by partial unique indexes.
- Site Audit Events carry the Site in `entity_id`, not `site_id`, so a fresh Site can still be deleted; any other row pointing at the Site refuses the delete (`site_has_records`).
- A Season's banner is its Season Illustration, whose two pictures live in RustFS (`oleoziza-public`, keys `seasons/<code>/<variant>-<uuid>.<ext>`), never in the front's assets. New ones come from `backend/seeds/fixtures/seasons/` through `python -m seeds illustrations`.
- Models: Site, SeasonIllustration, Season, CodeSequence.
- `business/season_lookup.py` says which Season a day counts in (`get_season_of_day`: the last one started by then, off-season days included), what a closed Season locks (`is_day_locked`: what came before the day it closed) and what a period covers (`get_period_range`, from the Seasons' real dates). The front mirrors the first two in `season/composables/season-of-day.ts`.
