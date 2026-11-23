# Territory

## Business
The 8 [Provinces](../../../../../GLOSSARY.md) of the Oriental and their main towns, where Clients and Sites are located: the location fields (province tiles, town chips, address) and the province map.

## Exposes
- Store `useTerritoryStore`: `provinces`, `findProvince(id)`, `shapes` (the map's SVG paths), `fetchProvinces()` (once per session through `cachedLoad`; the browser also keeps the answer a day).
- Service: `TerritoryService.getProvinces()` → `GET /api/territory/provinces`.
- Components: `location-fields.vue`, `province-map.vue` (each loads the Provinces itself; the shared `cachedLoad` sends one request).
- Composables: `location.ts` (`provinceOfCity`, `withProvince`, `withCity`, `formatArea`, all taking the Provinces), `province-shapes.ts` (`buildProvinceShapes`).

## How to reuse
Show a location with `formatArea(territoryStore.findProvince(id))`, after `territoryStore.fetchProvinces()` in the component's `onMounted`.

## Rules and gotchas
- The outlines come from the backend; the mock reads `constants/mock-province-outlines.json` through a dynamic import, so the API build never bundles it.
- Oriental only for now: `ProvinceId` stays a union of the 8 slugs.
