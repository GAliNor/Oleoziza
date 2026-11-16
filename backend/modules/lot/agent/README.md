# Lot

## Business
A Client's olives from [Reception](../../../../GLOSSARY.md) to oil: the [Lot](../../../../GLOSSARY.md) with its weighing and Pressing attributes, the [Boxes](../../../../GLOSSARY.md) it occupies ([Box Occupancy](../../../../GLOSSARY.md)), [Pressing Pauses](../../../../GLOSSARY.md), [Lot Photos](../../../../GLOSSARY.md) and the [Notifications](../../../../GLOSSARY.md) sent about it.

## Exposes
- Endpoints: none yet (the `reception` and `lot` plugs add them).
- Models only: Lot, BoxOccupancy, PressingPause, LotPhoto, Notification.

## Refusal codes
None yet.

## Rules and gotchas
- One Lot per Box at a time; one Lot per Press Line (Malaxeur) at a time, each with its own queue.
- Written offline by Operators: ids minted by the front, `OfflineEntryMixin`, code from the Code Sequence given at sync.
- The creator is `created_by_id`; a second person has their own column (`pressing_started_by_id`…).
