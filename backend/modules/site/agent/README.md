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
  - `PUT /seasons/{id}/illustration?variant=light|dark`: upload a banner to the public RustFS bucket.
- Services: `SiteService` (list, create, update, delete), `SeasonService` (list, prepare, open, close, upload).
- Business: `resolve_site_ids(db, current_user, requested)`: the repeated `siteId` rule every module's collections use (none = every Site held); `store_season_illustration`.

## Refusal codes
- `site_not_found`, `season_not_found` (404); `sites_forbidden`, `site_forbidden`, `season_forbidden` (403).
- `code_taken`, `site_has_records` (409); `province_not_found` (422).
- `season_already_planned`, `season_not_planned`, `season_not_open` (409).
- `too_large` (413), `unsupported_type` (415): banner upload.

## Rules and gotchas
- One open Season and one planned Season at most, held by partial unique indexes.
- Site Audit Events carry the Site in `entity_id`, not `site_id`, so a fresh Site can still be deleted; any other row pointing at the Site refuses the delete (`site_has_records`).
- A Season's banner lives in RustFS (`oleoziza-public`), never in the front's assets.
- Models: Site, Season, CodeSequence.
