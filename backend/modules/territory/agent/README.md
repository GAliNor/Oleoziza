# Territory

## Business
The 8 [Provinces](../../../../GLOSSARY.md) of the Oriental (with their outlines for the map) and their towns ([Cities](../../../../GLOSSARY.md)), where Clients and Sites are located. Reference data, seeded.

## Exposes
- Endpoints: `GET /api/territory/provinces` (signed-in Users): every Province in order with `labelAt` [lng, lat], its GeoJSON `boundary` and its towns; `Cache-Control: private, max-age=86400`.
- Services: `TerritoryService.list_provinces` (two queries: Provinces, then every City).
- Models: Province (slug id, kind, `position`, centre, outline), City (stable uuid5 id, `position`).

## Refusal codes
None.

## Rules and gotchas
- Seeded by `python -m seeds reference` from `seeds/fixtures/oriental-provinces.json` (geoBoundaries, ODbL).
- Oriental only for now.
