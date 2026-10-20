---
id: 12
title: Set up the front project
label: wayfinder:task
status: closed
assignee: Ali
blocked-by: []
---

## Question

Scaffold the front so feature work can start: Vue 3 + Vite + TypeScript + Tailwind + Pinia + vite-plugin-pwa, following the `vue-frontend-style` skill (module-per-business with a global module, auto-registered plugins/directives/locales/routes, light main.ts). Includes: the `VITE_DATA_SOURCE=mock|api` switch skeleton with one example module service, French i18n, PWA manifest + service worker (installable), placeholder palette tokens from the map's palette direction, and a responsive app shell. Data models, the full service contract and final tokens stay with their own tickets.

## Resolution

Done on 2026-10-20. Type-check and production build pass; the app renders at 390 px and 1280 px.

- Versions: Vue 3.5, Vite 8.3, Vue Router 5.4, Pinia 4.1, vue-i18n 11.4, Tailwind 4.3 (JS palette loaded via `@config`), vite-plugin-pwa 2.0 (`generateSW`, `registerType: 'prompt'`), axios 1.20. TypeScript pinned to 5.9 because vue-tsc does not support TypeScript 7.
- npm 11 is required (`packageManager` field); npm 10.8 crashes on Vite 8's peer dependencies.
- Mock/API switch: `VITE_DATA_SOURCE` read in `global/services/base.ts`; each service file exports the mock or API class behind one interface (`global/services/site.ts` is the example); `mockResolve` adds `VITE_MOCK_LATENCY_MS` latency.
- Site is the first resource and lives in `global` (every module needs the current Site); mock Sites are placeholders until the data models are decided.
- App shell: sidebar on desktop, bottom nav on phone, online/offline badge, "new version" banner. Icons (192, 512, maskable, apple-touch) are placeholders.
- Left to their tickets: the Dexie outbox and `injectManifest` (Service contract), final tokens (Design tokens page), auth guard (Auth data model).
