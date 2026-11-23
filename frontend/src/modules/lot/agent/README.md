# Lot

## Business
A Client's olives from [Reception](../../../../../GLOSSARY.md) to oil: the [Lot](../../../../../GLOSSARY.md) register and board (Opérations), its detail and timeline, its moves, Pressing schedule, and its money as Management and the Accountant see it.

## Exposes
- Views: `lot` → `views/entry.vue` (Opérations: register or board, `?lot=<id>` opens one, `&fromClient=<clientId>` brings « Retour au client »); `discount-queue` → `views/discounts.vue`.
- Components: `lot-detail.vue` (the shared Lot detail, used by Opérations, the Operator's Lot sheet and Client page, Recouvrement and the Finances « Impayés » tab), `lot-money.vue` (its « Paiement » section: amount due, « Encaisser », « Donner une remise », « Corriger le tarif », the Lot's Payments), `rate-form.vue`, `discount-form.vue`, `lot-schedule-form.vue`.
- `lots-without-line.vue`: « Sans malaxeur (n) » on the Operator Home and Opérations, 10 at a time, pending Receptions first; a row gives its Press Line in two taps.
- Store `useLotStore`: `lots`, `withoutLine` (paged), `photosByLot`, `fetchLots`, `fetchPhotos`, `moveLot` (outbox), `scheduleLot`, `giveDiscount`, `decideDiscount`, `correctRate`.
- Service: `LotService` → `/api/lot/lots` (`…/moves`, `…/schedule`, `…/discount`, `…/discount/decision`, `…/rate`, `…/contact-found`).
- Composables: `fee.ts` (`millingFee`, `amountDue`, `paymentStateOf`, `rateFee`, `lowestRate`, `canCorrectRate`), `timeline.ts`, `lot-boxes.ts`, `use-lot-register.ts` (`useOpenLot`).

## Rules and gotchas
- The money section shows only on a Service Milling Lot to someone holding an amount Permission; each action checks its own Permission on the Lot's Site, so an Operator sees none (R17, M8). Rate corrections reach the timeline only for the same people.
- « Corriger le tarif » needs `lot.set_price` and a reason; the form blocks a rate below `lowestRate` (what is paid or pending plus the Discount in force, and never below a Discount not refused), and the backend refuses the same cases.
- A waiting Lot without a Box shows « Hors box ».
