# Configuration

## Business
A [Site](../../../../../GLOSSARY.md)'s [Configuration](../../../../../GLOSSARY.md) for a [Season](../../../../../GLOSSARY.md): prices and their dated changes, [Payment Methods](../../../../../GLOSSARY.md), Boxes, Tanks and [Press Lines](../../../../../GLOSSARY.md); and, for the whole company, the [Notification Channels](../../../../../GLOSSARY.md) the mill may message Clients through.

## Exposes
- View: `/configuration` → `views/entry.vue`: for an Owner, a hub of two `configuration-hub-card`s (« Saison et paramètres » → `/configuration/settings`, « Intelligence artificielle » → `/configuration/ai` of the `ai` module, with the key and this month's spend); anyone else with `configuration.manage` sees the settings right there.
- View: `/configuration/settings` → `views/settings.vue`, both rendering `configuration-settings.vue`: Season tabs (« + Préparer ») and banner, `season-properties` (status, dates; open, close and reopen slide to `ui-consequences` inside the card before they are done, texts in `season-consequences.ts`; « Supprimer » emits `remove` and the whole page below the title slides to `season-removal`: « Retour à la configuration », `ui-delete-animation` (played once, then held), centered consequences, the Season's name typed to confirm), `configuration-site` (one global `ui-section` per subject, its own icon and tint: Prix, Malaxeurs, Cuves, Box, Modes de paiement; values edited in place with `ui-property`), then « Notifications aux clients ». The page shows no settings history (it stays in the data and in each price's own history). `use-configuration-lock` says why a line is locked.
- Store: `useConfigurationStore`: `bySite` (open Season), `bySeason`, `notificationChannels` (from any Configuration answer, kept on the device), getter `enabledNotificationChannels`; actions `fetchSites`, `fetchSeason`, `update`, `deletePriceChange`, `updateNotificationChannel`.
- Service: `ConfigurationService` (`GET /configuration?siteId=`, `PATCH /configuration/{siteId}`, `PUT /configuration/notification-channels/{channel}`).

## How to reuse
```ts
const channels = useConfigurationStore().enabledNotificationChannels; // ['email'] once email is switched on
```

## Rules and gotchas
- A channel is offered only when implemented (declared by the backend) and switched on; every channel starts off. Switching needs the Owner or `configuration.manage` on every Site; the section shows read-only otherwise.
- Reception hides the notification question when no channel is enabled and saves « Aucune »; the Operator Lot sheet asks for a missing contact only while the Lot's channel is enabled.
- The channels have no read of their own: they ride on every Configuration answer, which Reception and this page already load.
- A fresh install has no Season: Payment Methods and equipment still load and save; prices wait for a Season.
- A price always changes now, after its save button or Enter (`is-explicit`), never by leaving the field.
