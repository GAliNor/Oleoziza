# Plugins

One file per runtime library, and only that file imports the package (`import type` is fine anywhere). `main.ts` globs this folder and calls each `install(app)`; a plugin with nothing to install into Vue exports no `install`.

| File | Library | What it exports |
| --- | --- | --- |
| `barcode-detector.ts` | barcode-detector, zxing-wasm | `getQrDetector()`: the browser's `BarcodeDetector` when it reads QR codes, else the ZXing WASM ponyfill, loaded on first scan with its `.wasm` served by the app. Used by `global/composables/use-qr-scanner.ts`. |
| `axios.ts` | axios | `http`, the shared client (credentials on, JSON); `isHttpError`. Services reach it through `BaseService.request<T>()`. |
| `dicebear.ts` | @dicebear/core, @dicebear/styles | `renderAvatarDataUri`, `AvatarStyleName`. Styles load lazily on first use. Used by `global/composables/avatar.ts`. |
| `fontsource.ts` | @fontsource-variable/noto-sans-arabic | Nothing: importing it declares the Arabic typeface, downloaded only when Arabic text shows. |
| `i18n.ts` | vue-i18n | `install`, `i18n`. Loads every `modules/*/locales/*.json`, starts in the device's language and keeps `lang` and `dir` on the document in step. |
| `jose.ts` | jose | `importJwtKey`, `verifyJwt`, `readUnverifiedJwt`, `signJwt` (ES256). Claims are read in `auth/services/token.ts`. |
| `lean-qr.ts` | lean-qr | `renderQrSvg(text)`: a QR code as one SVG path. Used by `global/components/ui-qr-code.vue`. |
| `map.ts` | maplibre-gl, through `lib/map` | `install`. One static map; `useMap()` from `map`. MapLibre also lives in `lib/map/adapters/maplibre/` and loads on the first `<MapView>`. |
| `pinia.ts` | pinia | `install`. |
