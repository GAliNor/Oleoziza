# Reception

## Business
An Operator receiving a Client's olives: weighing, Boxes, Press Line queue, Notification Choice, then the done screen with the Lot's ticket.

## Exposes
- Store `useReceptionStore`: `settings` (from the open Season's Configuration, through the configuration store), `fetchSite` (Configuration, Lots and Clients together), `refreshSettings`, `receiveLot` (offline: a pending Lot at once, sent by the outbox as `reception.receive`).
- Service: `ReceptionService.receiveLot` → `POST /api/lot/lots`.
- Composables: `buildPendingLot`.

## Rules and gotchas
- No reception-settings endpoint: the Configuration the rest of the app caches holds them.
- The done screen reads the live Lot from the lot store: the code and QR appear once the server answered.
- Save needs the chosen Boxes to hold the net weight (count × the Site's Box capacity), unless « Ignorer les box » is ticked (`areBoxesIgnored` in the payload): then the Boxes picked are kept, possibly none, and the Lot shows « Hors box ». The backend refuses the same case with `box_capacity_short`.
