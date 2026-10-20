---
title: Oleoziza front MVP
label: wayfinder:map
---

## Destination

A decision-complete spec for the Oleoziza front MVP (Vue PWA on mock services): data models, mock/API service contract, screens per persona and design tokens all decided, so building can start with the project-setup ticket and proceed feature by feature without open questions.

## Notes

- Domain: one owner running several mills (Sites); main activity is Service Milling, with Purchases and Product sales on the side. Vocabulary lives in [GLOSSARY.md](../GLOSSARY.md); consult and update it.
- Skills to consult every session: `domain-modeling` (always), `vue-frontend-style` (any front structure decision).
- Standing decisions from charting (2026-10-20):
  - Stack: Vue 3 + Vite + TypeScript + Tailwind + Pinia + vite-plugin-pwa, Ali's module-per-business conventions.
  - Data: per-module services with one async interface; `VITE_DATA_SOURCE=mock|api` picks the implementation; mock data are constants, with simulated latency/errors.
  - UI in French, i18n-ready (all labels in locale files).
  - Offline: Operator writes work offline via a sync queue with a "pending sync" badge; Management and Client Space read cached data only.
  - Multi-site (2026-10-20): each Site has its own Operators, Receptions, stock and treasury. Users are assigned one or more Sites and see only those; Management can have all Sites plus a consolidated view. Clients are shared across Sites and see their activity at every Site.
  - Audit Trail: every change records who did what, when, and on which Site; visible to Management.
  - Clients are either Individuals or Companies.
  - Execution override: the "Set up the front project" task is carried into this map at Ali's request and is built, not just decided.
  - Personas: Management, Operator, Client. Roles are permission bundles; Management grants Permissions (e.g. confirm Payments) in the Backoffice.
  - Client login: phone + PIN, email + password, and phone + SMS code (OTP), all three.
  - One Lot per Reception; several Weighings per Reception; Lot status queue (received → waiting → pressing → pressed → withdrawn); no appointments.
  - Oil stored in kg, litres shown alongside via a density setting.
  - Payments: cash, share of oil, bank transfer, cheque; optional Payment Proof image; confirmed by a user with the Permission; cancellation yields a Credit Note or a Refund.
  - Finance monitoring: Client balances, treasury, expenses, revenue & margins. Everything grouped by Season.
  - Scale software and ticket printer: modelled (source manual|scale) and simulated in mock; real integration later.
  - Palette direction: olive as brand/primary (#D2D6BD, #96A586, #73835a, plus a darker ~#5C6A47 for text/hover), owner colours as ~10% accent (#A66127, #8B5A2B, #D4A373; #E9C46A only for yield/KPI highlights), warm stone neutrals, distinct bluer success green. To be confirmed by prototype.

## Decisions so far

- [Offline writes in a Vue PWA: IndexedDB queue and iOS limits](tickets/0003-offline-writes-in-vue-pwa.md): own Dexie outbox + sync loop (no Background Sync), client UUIDs + Idempotency-Key, Operators on the installed iOS app; money confirmations online-only.
- [Set up the front project](tickets/0012-front-project-setup.md): Vue 3.5 + Vite 8 + Tailwind 4 + Pinia 4 + PWA scaffold on npm 11, TypeScript pinned to 5.9; mock/API switch per service file, Site as the first global resource.

## Not yet specified

- Dashboard KPIs: which figures Management sees first, and per-Season comparisons.
- Printed ticket layout (Reception/Weighing/Pressing tickets), once the printer is known.
- Season lifecycle: what opening/closing a Season locks or carries over (balances, Oil Stock).
- Notifications to Clients (Lot pressed, Payment confirmed): channel and triggers.
- Documents: invoices/receipts as PDF, numbering rules.
- Arabic and right-to-left layout.

## Out of scope

- The backend itself (the MVP targets mock services).
- Real integration with the scale software and ticket printer (modelled and simulated only).
- Pressing appointments / slot booking.
