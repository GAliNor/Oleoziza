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
- The code (two capital letters) is typed at creation and never sent again.
- Creating and deleting need the Owner; editing needs `site.manage`. A Site with any record can't be deleted (`site_has_records`).
- The mock's seeded Sites refuse deletion like the backend's.
