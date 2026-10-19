---
id: 3
title: Offline writes in a Vue PWA: IndexedDB queue and iOS limits
label: wayfinder:research
status: closed
assignee:
blocked-by: []
---

## Question

How should a Vue 3 + vite-plugin-pwa app queue Operator writes offline and sync them later? Compare IndexedDB wrappers (Dexie, idb, localForage), Workbox Background Sync vs an app-level sync loop, and the limits on iOS Safari installed PWAs (storage eviction, no Background Sync, quotas). Also: how should image uploads (Payment Proof) behave offline? Output a recommendation the service-contract ticket can build on.

## Resolution

Findings: `research/offline-writes-in-vue-pwa.md` on branch `research/offline-writes-in-vue-pwa` (never merged).

- Build our own outbox and sync loop instead of Workbox Background Sync, which Safari/iOS doesn't support and which can't drive a "pending sync" badge or show business errors.
- Dexie 4.x on IndexedDB; each Operator write stores the record and an outbox entry together; `liveQuery` drives the badge; the loop drains while the app is open.
- Contract: client-generated UUIDs, `Idempotency-Key` on every write, `syncStatus: pending | synced | failed`, entries sent in order per record; network/5xx/429 retry with backoff, other 4xx marked failed and shown to the Operator. Confirming Payments, Credit Notes, Refunds, Season open/close and prices are online-only. The mock goes through the same outbox.
- Payment Proof: resized JPEG Blob stored locally, uploaded as its own outbox item linked to the Payment, deleted only after the server confirms.
- iOS: Operators must use the installed Home Screen app; call `navigator.storage.persist()` after login; warn when pending items are older than about 24 h. Read-only cache for Management and the Client Space (NetworkFirst with a timeout, "data as of" label); app updates held until the outbox is empty.
- Open for the service contract: what happens when two Operators change the same Lot offline; the backend must store idempotency keys and accept client UUIDs.
