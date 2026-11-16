# Configuration

## Business
A [Site](../../../../GLOSSARY.md)'s [Configuration](../../../../GLOSSARY.md) for one [Season](../../../../GLOSSARY.md): prices with their dated and scheduled changes, the [Payment Methods](../../../../GLOSSARY.md) it accepts, its [Boxes](../../../../GLOSSARY.md), [Tanks](../../../../GLOSSARY.md) and [Press Lines](../../../../GLOSSARY.md) (« Malaxeurs » on screen), and the [olive varieties](../../../../GLOSSARY.md). Every change is an [Audit Event](../../../../GLOSSARY.md), which is also the page's history.

## Exposes
- Endpoints (`/api/configuration`):
  - `GET /{site_id}` (`?seasonId=` for another Season): the whole Configuration with its history. Any User with the Site.
  - `PATCH /{site_id}`: one change per request (a price, a Payment Method, equipment), idempotent by the front's event id. `configuration.manage`.
  - `DELETE /{site_id}/price-changes/{change_id}`: cancel a scheduled price change.
- Services: `ConfigurationService.get_configuration` (the reception settings read it).

## Refusal codes
- `site_not_found`, `season_not_found`, `price_change_not_found` (404); `site_forbidden`, `configuration_forbidden` (403).
- `season_closed`, `season_not_open` (409): a closed Season is frozen.
- `date_in_past`, `date_outside_season`, `discount_limit_too_high`, `number_taken`, `one_change_per_request` (422).
- `change_in_force` (409): a change already in force can't be cancelled.
- `box_in_use`, `tank_in_use`, `line_in_use`, `last_method` (409): equipment holding a Lot, or the last Payment Method.

## Rules and gotchas
- Prices are versioned rows (Site Setting with `effective_from`), never overwritten; a change dated ahead is « scheduled ».
- Equipment is retired (`retired_at`), never deleted. The demo seed keeps the front mock's Tank and Press Line ids.
- `service` is 540 lines: split by sub-resource (prices, equipment) when next touched.
- Models: SiteSetting, PaymentMethodSetting, Box, Tank, PressLine, OliveVariety.
