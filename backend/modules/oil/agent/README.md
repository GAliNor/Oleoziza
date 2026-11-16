# Oil

## Business
The oil a Lot gives: where it is kept ([Storage](../../../../GLOSSARY.md) in a Tank or with the Client, drawn by [Storage Draws](../../../../GLOSSARY.md)) and how it leaves the mill ([Withdrawals](../../../../GLOSSARY.md) with their lines). Oil Stock and Mill Stock are derived.

## Exposes
- Endpoints: none of its own; the Lot's moves write Storages, Draws and Withdrawals (`lot/services/lot_move_services.py`).
- Business: `get_tank_fills` (litres held per Tank), `get_storage_remainders` (litres left per Storage).
- Models: Storage, StorageDraw, Withdrawal, WithdrawalLine.

## Refusal codes
None yet.

## Rules and gotchas
- Litres are `Numeric(10, 1)` with `_in_litres` names.
- Withdrawals get a server code from the Code Sequence; written offline too.
