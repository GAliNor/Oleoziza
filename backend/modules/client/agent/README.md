# Client

## Business
The mill's [Clients](../../../../GLOSSARY.md) (farmers, companies) shared by every Site, with their [Client Contacts](../../../../GLOSSARY.md) and their location in the Oriental. Balances are derived from Lots and Payments, never stored.

## Exposes
- Endpoints: none yet (the `client` plug adds them).
- Models only: Client, ClientContact.

## Refusal codes
None yet.

## Rules and gotchas
- A Client's location is required (Province within the 8 Oriental provinces, city, address).
- Created offline by Operators too: `OfflineEntryMixin` (`entered_at`, `was_recorded_offline`, `device_label`), id minted by the front.
- CIN and ICE are `national_id_number` and `company_identifier`; titles are English enum values (`mr`, `hajj`…).
