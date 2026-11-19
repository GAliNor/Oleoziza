# Plugins

One file per runtime library, and only that file imports the package (`import type` is fine anywhere). `main.ts` globs this folder and calls each `install(app)`; a plugin with nothing to install into Vue exports no `install`.

| File | Library | What it exports |
| --- | --- | --- |
| `barcode-detector.ts` | barcode-detector, zxing-wasm | `getQrDetector()`: the browser's `BarcodeDetector` when it reads QR codes, else the ZXing WASM ponyfill, loaded on first scan with its `.wasm` served by the app. Used by `global/composables/use-qr-scanner.ts`. |
| `axios.ts` | axios | `http`, the shared client (credentials on, JSON); `isHttpError`. Services reach it through `BaseService.request<T>()`. |
| `date-fns.ts` | date-fns | `DATE_FNS_LOCALES`: the fr and ar (Morocco) date-fns locales, for the date picker. |
| `dicebear.ts` | @dicebear/core, @dicebear/styles | `renderAvatarDataUri`, `AvatarStyleName`. Styles load lazily on first use. Used by `global/composables/avatar.ts`. |
| `fontsource.ts` | @fontsource-variable/noto-sans-arabic | Nothing: importing it declares the Arabic typeface, downloaded only when Arabic text shows. |
| `i18n.ts` | vue-i18n | `install`, `i18n`. Loads `modules/*/locales/*.json` except the dev-only Kit, whose view loads its own messages; starts in the device's language and keeps `lang` and `dir` on the document in step. |
| `jose.ts` | jose | `importJwtKey`, `verifyJwt`, `readUnverifiedJwt`, `signJwt` (ES256). Claims are read in `auth/services/token.ts`. |
| `lean-qr.ts` | lean-qr | `renderQrSvg(text)`: a QR code as one SVG path. Used by `global/components/ui-qr-code.vue`. |
| `map.ts` | maplibre-gl, through `lib/map` | `install`. One static map; `useMap()` from `map`. MapLibre also lives in `lib/map/adapters/maplibre/` and loads on the first `<MapView>`. |
| `pinia.ts` | pinia | `install`, `resetStoresExcept(ids)`: puts every created store back to its initial state except the ids given; sign-out uses it so the next person sees nothing of the last. |
| `vuepic.ts` | @vuepic/vue-datepicker | `install`: registers async `<VueDatePicker>`, loading the component and its stylesheet together on first use. Only `global/components/ui-date-picker.vue` uses it; the theme maps to our tokens in `styles/date-picker.css`. |
