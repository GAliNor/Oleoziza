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
  - `POST /seasons` takes an optional body `{seasonIllustrationId}`: the new Season uses that [Season Illustration](../../../../GLOSSARY.md).
  - `PUT /seasons/{id}/season-illustration` (`season.manage`): `{seasonIllustrationId}` picks one, `null` drops it.
  - `GET /season-illustrations` (any signed-in User): the available Season Illustrations, newest code first, each with `illustrationUrl` and `illustrationDarkUrl`.
  - `PUT /seasons/{id}/illustration?variant=light|dark`: unused by the front since the picker. Uploads one picture into the Season Illustration named after the Season's code (created with that picture as both versions when missing) and makes the Season use it.
- Services: `SiteService` (list, create, update, delete), `SeasonService` (list, prepare, open, close, choose_illustration, upload), `SeasonIllustrationService` (list).
- Business: `resolve_site_ids(db, current_user, requested)`: the repeated `siteId` rule every module's collections use (none = every Site held); `season_art`: `store_illustration_image`, `store_season_illustration`, `read_season_illustrations` (one query, URLs built from the two Files).

## Refusal codes
- `site_not_found`, `season_not_found`, `season_illustration_not_found` (404); `sites_forbidden`, `site_forbidden`, `season_forbidden` (403).
- `code_taken`, `site_has_records` (409); `province_not_found` (422).
- `season_already_planned`, `season_not_planned`, `season_not_open` (409).
- `too_large` (413), `unsupported_type` (415): banner upload.

## Rules and gotchas
- One open Season and one planned Season at most, held by partial unique indexes.
- Site Audit Events carry the Site in `entity_id`, not `site_id`, so a fresh Site can still be deleted; any other row pointing at the Site refuses the delete (`site_has_records`).
- A Season's banner is its Season Illustration, whose two pictures live in RustFS (`oleoziza-public`, keys `seasons/<code>/<variant>-<uuid>.<ext>`), never in the front's assets. New ones come from `backend/seeds/fixtures/seasons/` through `python -m seeds illustrations`.
- Models: Site, SeasonIllustration, Season, CodeSequence.
