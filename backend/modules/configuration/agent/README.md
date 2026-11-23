# Configuration

## Business
A [Site](../../../../GLOSSARY.md)'s [Configuration](../../../../GLOSSARY.md) for one [Season](../../../../GLOSSARY.md): prices with their dated and scheduled changes, the [Payment Methods](../../../../GLOSSARY.md) it accepts, its [Boxes](../../../../GLOSSARY.md), [Tanks](../../../../GLOSSARY.md) and [Press Lines](../../../../GLOSSARY.md) (« Malaxeurs » on screen), and the [olive varieties](../../../../GLOSSARY.md); and, for the whole company, the [Notification Channels](../../../../GLOSSARY.md) the mill may message Clients through. Every change is an [Audit Event](../../../../GLOSSARY.md), which is also the page's history.

## Exposes
- Endpoints (`/api/configuration`):
  - `GET /{site_id}` (`?seasonId=` for another Season): the whole Configuration with its history. Any User with the Site.
  - `PATCH /{site_id}`: one change per request (a price, a Payment Method, equipment), idempotent by the front's event id. `configuration.manage`.
  - `DELETE /{site_id}/price-changes/{change_id}`: cancel a scheduled price change (`configuration.manage`), or delete one in force (Owner): the price before it applies again.
  - `GET /notification-channels`: WhatsApp, SMS, email with `isImplemented` and `isEnabled`. Any signed-in staff member. Declared before `/{site_id}`.
  - `PUT /notification-channels/{channel}` `{isEnabled}`: switch one channel for every Site. The Owner, or `configuration.manage` on every Site.
- Every Configuration answer also carries `notificationChannels`, so Reception reads them without another request.
- Every answer carries `nextTankNumber` and `nextPressLineNumber`, the next free numbers, retired ones counted.
- Services: `ConfigurationService.get_configuration` (the reception settings read it); `NotificationChannelService` (`notification_channel_services.py`).
- Business: `list_enabled_notification_channels(db)` (switched on and implemented; the lot module reads it at pressing), `build_notification_channel_views(db)`.

## Refusal codes
- `site_not_found`, `season_not_found`, `price_change_not_found` (404); `site_forbidden`, `configuration_forbidden` (403).
- `season_closed` (409): a closed Season is frozen. `season_not_open` (409): a price without a Season; nothing else needs one.
- `date_in_past`, `date_outside_season`, `discount_limit_too_high`, `number_taken`, `one_change_per_request` (422).
- `change_in_force` (409): a change in force is deleted by an Owner only.
- `box_in_use`, `tank_in_use`, `line_in_use`, `last_method` (409): equipment holding a Lot, or the last Payment Method.
- `notification_channel_not_implemented` (409): switching on a channel the mill can't send through yet.

## Rules and gotchas
- Prices are versioned rows (Site Setting with `effective_from`), never overwritten (`business/price_versions.py`); two set for the same instant: the later one wins (by id, time-ordered); the front always changes them now, a change dated ahead is still read and cancellable.
- Equipment (`business/equipment_changes.py`) used by any Lot or Storage is retired (`retired_at`); never-used equipment is deleted for real when an Owner removes it, and its number is free again. The demo seed keeps the front mock's Tank and Press Line ids.
- Payment Methods, Boxes, Tanks and Press Lines belong to no Season: they save and read with none open (`seasonId` is then null).
- Notification Channels: one row per channel, no row means off (every channel starts off). Which ones can send is `IMPLEMENTED_NOTIFICATION_CHANNELS` in `constants/` (email only): add a channel there once its sending is wired.
- Models: SiteSetting, PaymentMethodSetting, NotificationChannelSetting, Box, Tank, PressLine, OliveVariety.
