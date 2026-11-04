# Plugins

One file per runtime library, and only that file imports the package (`import type` is fine anywhere). `main.ts` globs this folder and calls each `install(app)`; a plugin with nothing to install into Vue exports no `install`.

| File | Library | What it exports |
| --- | --- | --- |
| `axios.ts` | axios | `http`, the shared client (credentials on, JSON); `isHttpError`. Services reach it through `BaseService.request<T>()`. |
| `dicebear.ts` | @dicebear/core, @dicebear/styles | `renderAvatarDataUri`, `AvatarStyleName`. Styles load lazily on first use. Used by `global/composables/avatar.ts`. |
| `i18n.ts` | vue-i18n | `install`, `i18n`. Loads every `modules/*/locales/*.json`. |
| `jose.ts` | jose | `importJwtKey`, `verifyJwt`, `readUnverifiedJwt`, `signJwt` (ES256). Claims are read in `auth/services/token.ts`. |
| `map.ts` | maplibre-gl, through `lib/map` | `install`. One static map; `useMap()` from `map`. MapLibre also lives in `lib/map/adapters/maplibre/` and loads on the first `<MapView>`. |
| `pinia.ts` | pinia | `install`. |
