# Site

## Business
The owner's mills ([Sites](../../../../../GLOSSARY.md)): the Sites page (list, create, edit, delete), the site switcher and « Tous les sites ».

## Exposes
- Store `useSiteStore`: `sites`, `currentSiteId`, `isAllSites`, `accessibleSites`, `can(permission)`, `fetchSites()` (once per signed-in User, from the router guard), `selectSite`, `save` and `remove` (the answer goes into the list, no reload; `saveErrorCode` holds a refusal).
- Service: `SiteService` → `GET|POST /api/site/sites`, `PUT|DELETE /api/site/sites/{id}`.
- Composables: `siteErrorMessage(code, fallback)`.

## How to reuse
Label a Site with `siteStore.sites.find(...)`: every screen already has the list.

## Rules and gotchas
- An Owner with no Site yet (a fresh production start) can only reach the Sites page: `can()` grants `site.manage` alone while `isAwaitingFirstSite`, so the menu shows only Sites and the Home sends the Owner there. Creating the first Site selects it, which unlocks every page at once (the Owner holds every Permission on any Site).
- The code (two capital letters) is typed at creation and never sent again.
- Creating and deleting need the Owner; editing needs `site.manage`. A Site with any record can't be deleted (`site_has_records`).
- The mock's seeded Sites refuse deletion like the backend's.
