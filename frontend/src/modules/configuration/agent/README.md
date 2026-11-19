# Configuration

## Business
A [Site](../../../../../GLOSSARY.md)'s [Configuration](../../../../../GLOSSARY.md) for a [Season](../../../../../GLOSSARY.md): prices and their dated changes, [Payment Methods](../../../../../GLOSSARY.md), Boxes, Tanks and [Press Lines](../../../../../GLOSSARY.md); and, for the whole company, the [Notification Channels](../../../../../GLOSSARY.md) the mill may message Clients through.

## Exposes
- View: `/configuration` → `views/entry.vue`: Season tabs and banner, the price agenda per Site, the Site's settings (`configuration-site`), then « Notifications aux clients » (`configuration-notifications`).
- Store: `useConfigurationStore`: `bySite` (open Season), `bySeason`, `notificationChannels` (from any Configuration answer, kept on the device), getter `enabledNotificationChannels`; actions `fetchSites`, `fetchSeason`, `update`, `cancelPriceChange`, `updateNotificationChannel`.
- Service: `ConfigurationService` (`GET /configuration?siteId=`, `PATCH /configuration/{siteId}`, `PUT /configuration/notification-channels/{channel}`).

## How to reuse
```ts
const channels = useConfigurationStore().enabledNotificationChannels; // ['email'] once email is switched on
```

## Rules and gotchas
- A channel is offered only when implemented (declared by the backend) and switched on; every channel starts off. Switching needs the Owner or `configuration.manage` on every Site; the section shows read-only otherwise.
- Reception hides the notification question when no channel is enabled and saves « Aucune »; the Operator Lot sheet asks for a missing contact only while the Lot's channel is enabled.
- The channels have no read of their own: they ride on every Configuration answer, which Reception and this page already load.
