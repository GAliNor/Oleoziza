# Client

## Business
[Clients](../../../../../GLOSSARY.md) shared by every Site: the Operator's picker and quick form, the search, a Client's page (account, history), and Management's register.

## Exposes
- Store `useClientStore`: `clients` (whole list, `fetchClients` via `cachedLoad('clients')`), `records` (`fetchRecords`), `accountOf` (`fetchAccount`), `histories` (`fetchHistory`), `createClient` (offline: optimistic, pending, sent by the outbox as `client.create`), `updateContact`.
- Service: `ClientService` → `/api/client/clients…`.
- Composables: `buildClientName`, identifier and activity helpers.

## How to reuse
Show a Client from `clientStore.clientById(id)`; call `fetchClients()` in the view (one shared request, kept 60 s).

## Rules and gotchas
- An Individual is typed as first and last name, a Company as its legal name; `name` is the display name the backend builds.
- A list reload keeps Clients still in the outbox.
- Until lot and finance are plugged, the mock Lots point at mock Clients that the database doesn't hold.
- A Lot row of the open Season links to Opérations (`/operations?lot=<id>&fromClient=<clientId>`); closing that Lot comes back to the Client page. Older Seasons' rows stay plain: Opérations holds the open Season only.
