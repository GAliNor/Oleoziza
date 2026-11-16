# Finance

## Business
Money between the mill and its [Clients](../../../../GLOSSARY.md): [Discounts](../../../../GLOSSARY.md) on a Lot's [Milling Fee](../../../../GLOSSARY.md), [Payments](../../../../GLOSSARY.md) split over Lots by [Payment Allocations](../../../../GLOSSARY.md) and proved by [Payment Proofs](../../../../GLOSSARY.md), [Credit Notes](../../../../GLOSSARY.md) and their uses, [Refunds](../../../../GLOSSARY.md), and [Debt Contacts](../../../../GLOSSARY.md) when chasing a balance.

## Exposes
- Endpoints: none yet (the `finance` plug adds them).
- Models only: Discount, Payment, PaymentAllocation, PaymentProof, CreditNote, CreditNoteUse, Refund, DebtContact.

## Refusal codes
None yet.

## Rules and gotchas
- The Milling Fee, a Lot's Payment State and a Client's balance are derived, never stored.
- One Discount in force per Lot; a refused one stays as history and needs a reason.
- A Refund is confirmed by someone other than the one who made it, and never paid in oil.
- An oil Payment carries its litres and price per litre.
