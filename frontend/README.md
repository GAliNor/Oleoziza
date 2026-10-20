# Oleoziza frontend

Front MVP for managing olive oil mills: Vue 3 PWA, installable on phones, working offline for Operators.

## Getting started

Requires Node `^20.19.0 || >=22.12.0` and **npm 11** (npm 10 crashes resolving Vite 8's peer dependencies): `npm i -g npm@11`.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (service worker enabled) |
| `npm run build` | Type-check, then production build with the PWA service worker |
| `npm run preview` | Serve the production build |
| `npm run type-check` | `vue-tsc` only |

## Mock vs backend

`VITE_DATA_SOURCE=mock|api` in `.env`. Each service file exports either its mock class (reading constants) or its API class, behind the same interface, so stores and views never change. See `src/modules/global/services/site.ts` for the pattern.

## Project map

- Domain vocabulary: [GLOSSARY.md](../GLOSSARY.md)
- Planning map and tickets: [.wayfinder/map.md](../.wayfinder/map.md)
- Conventions: Ali's `vue-frontend-style` (module per business, auto-registered plugins, directives, locales and routes)
