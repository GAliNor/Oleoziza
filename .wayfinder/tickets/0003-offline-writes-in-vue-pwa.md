---
id: 3
title: Offline writes in a Vue PWA: IndexedDB queue and iOS limits
label: wayfinder:research
status: open
assignee:
blocked-by: []
---

## Question

How should a Vue 3 + vite-plugin-pwa app queue Operator writes offline and sync them later? Compare IndexedDB wrappers (Dexie, idb, localForage), Workbox Background Sync vs an app-level sync loop, and the limits on iOS Safari installed PWAs (storage eviction, no Background Sync, quotas). Also: how should image uploads (Payment Proof) behave offline? Output a recommendation the service-contract ticket can build on.
