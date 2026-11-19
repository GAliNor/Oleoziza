# Finance

## Business
Money between the mill and its [Clients](../../../../../GLOSSARY.md): the Finances page (figures, Payments register, « Impayés », Refunds), the Caisse, Recouvrement and the payment form they share.

## Exposes
- Views: `finance` → `views/entry.vue` (tabs `?tab=pending|all|unpaid|refunds`; « Impayés » opens a Lot with `?lot=`), `cash-desk`, `debt-follow-up` → `views/debts.vue` (`?client=` opens that Client's debt, `&pay=1` with the payment form open).
- Components: `payment-form.vue` (`lotIds` ticks Lots at opening), `quick-payment.vue` (the payment form fed from a Lot or a Client), `lot-payments.vue` (a Lot's Payments with « Ajouter un justificatif »), `unpaid-lots.vue` (the « Impayés » tab, loads the Lots itself), `debt-detail.vue` (its Lots open the shared Lot detail).
- Store `useFinanceStore`: movements, sales, refunds, debt contacts; `recordPayment`, `addDocuments`, `decide`, `addDebtContact`…

## Rules and gotchas
- « Impayés » lists the open Season's Lots with an amount due, oldest first, whatever the page's period.
- The quick payment reads the Client's oil stock and credit from the client store; when the Client isn't loaded both read 0, so a payment in oil is blocked.
