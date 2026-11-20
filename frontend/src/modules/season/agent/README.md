# Season

## Business
The harvest [Seasons](../../../../../GLOSSARY.md), shared by every Site: one open at a time, the next one prepared ahead, then closed. Each Season may use one of the available [Season Illustrations](../../../../../GLOSSARY.md) as its banner; without one, the banner draws a year-varying sketch.

## Exposes
- Store: `useSeasonStore`: `seasons`, `illustrations`; getters `openSeason`, `plannedSeason`, `findSeason`; actions `fetchSeasons`, `fetchIllustrations` (cached `season-illustrations`), `prepareNext(seasonIllustrationId)`, `open`, `close`, `chooseIllustration(id, seasonIllustrationId)`.
- Components: `season-art.vue` (the banner picture: dusk version in dark mode, mirrored in right-to-left, sketch when none); `season-illustration-picker.vue`, standalone and lazy-loaded, `v-model` the picked Season Illustration id (`null` for the sketch), fetching the list itself; `season-illustration-option.vue`, one choice of the picker.
- Service: `GET /site/seasons`, `POST /site/seasons` (`{seasonIllustrationId}`), `POST …/{id}/open|close`, `PUT …/{id}/season-illustration`, `GET /site/season-illustrations`.

## How to reuse
```vue
<season-illustration-picker v-model="pickedId" :season-code="season.code" />
```

## Rules and gotchas
- Season Illustrations come from the backend's RustFS and are added by committing a pair to `backend/seeds/fixtures/seasons/`; the front never uploads them, and mock mode offers none.
- Several Seasons may share one Season Illustration.
