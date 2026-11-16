# Site

## Business
The mills ([Sites](../../../../GLOSSARY.md)) of one owner, the harvest [Seasons](../../../../GLOSSARY.md) (November to January, one open at a time) and the [Code Sequences](../../../../GLOSSARY.md) that number Lots, Payments, Refunds, Withdrawals and Expenses per Site and Season.

## Exposes
- Endpoints (`/api/site`):
  - `GET /seasons`: every Season, oldest first.
  - `POST /seasons`: prepare the next Season (status `planned`), prices carried over. `season.manage`.
  - `POST /seasons/{id}/open`, `POST /seasons/{id}/close`: opening closes the one under way.
  - `PUT /seasons/{id}/illustration?variant=light|dark`: upload a banner to the public RustFS bucket.
- Services: `SeasonService` (list, prepare, open, close, upload).
- Business: `store_season_illustration`.

## Refusal codes
- `season_not_found` (404), `season_forbidden` (403).
- `season_already_planned`, `season_not_planned`, `season_not_open` (409).
- `too_large` (413), `unsupported_type` (415): banner upload.

## Rules and gotchas
- One open Season and one planned Season at most, held by partial unique indexes.
- A Season's banner lives in RustFS (`oleoziza-public`), never in the front's assets.
- Models: Site, Season, CodeSequence.
