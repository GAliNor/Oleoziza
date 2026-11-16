# Territory

## Business
The 8 [Provinces](../../../../GLOSSARY.md) of the Oriental (with their outlines for the map) and their towns ([Cities](../../../../GLOSSARY.md)), where Clients and Sites are located. Reference data, seeded.

## Exposes
- Endpoints: none yet (the `territory` plug adds them).
- Models only: Province (slug id, kind, centre, GeoJSON outline), City (stable uuid5 id).

## Refusal codes
None yet.

## Rules and gotchas
- Seeded by `python -m seeds reference` from `seeds/fixtures/oriental-provinces.json` (geoBoundaries, ODbL).
- Oriental only for now.
