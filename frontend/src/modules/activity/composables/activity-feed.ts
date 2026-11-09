import { toIsoDate } from 'global/composables/date';
import type { ActivityGroup, ActivityKind, IActivity } from 'activity/types/activity';
import type { IConfigurationChange } from 'configuration/types/configuration';
import type { IDebtContact, IMovement, IRefund } from 'finance/types/finance';
import type { ILot } from 'lot/types/lot';

export interface IActivitySources {
  lots: readonly ILot[];
  movements: readonly IMovement[];
  refunds: readonly IRefund[];
  debtContacts: readonly IDebtContact[];
  configurationChanges: readonly IConfigurationChange[];
  clientNames: Readonly<Record<string, string>>;
}

const GROUPS: Record<ActivityKind, ActivityGroup> = {
  reception: 'production',
  pressing: 'production',
  pressed: 'production',
  withdrawal: 'production',
  stored: 'storage',
  discount_given: 'discount',
  discount_pending: 'discount',
  discount_approved: 'discount',
  discount_refused: 'discount',
  payment_recorded: 'payment',
  payment_confirmed: 'payment',
  payment_rejected: 'payment',
  payment_cancelled: 'payment',
  refund_made: 'payment',
  refund_confirmed: 'payment',
  debt_contact: 'follow',
  configuration: 'configuration',
};

/** Money is shown only to those who may see the finances: Discounts, Payments, Refunds and debt follow-up. */
const MONEY_GROUPS: ActivityGroup[] = ['discount', 'payment', 'follow'];

export const ACTIVITY_GROUPS: ActivityGroup[] = ['production', 'storage', 'discount', 'payment', 'follow', 'configuration'];

type Draft = Omit<IActivity, 'group' | 'isMoney' | 'amount' | 'litres' | 'kg' | 'params' | 'to'> & Partial<Pick<IActivity, 'amount' | 'litres' | 'kg' | 'params' | 'to'>>;

const activity = (draft: Draft): IActivity => ({
  amount: null,
  litres: null,
  kg: null,
  params: {},
  to: null,
  ...draft,
  group: GROUPS[draft.kind],
  isMoney: MONEY_GROUPS.includes(GROUPS[draft.kind]),
});

const lotLink = (lot: ILot): IActivity['to'] => ({ name: 'lot', query: { lot: lot.id } });

const lotEvents = (lot: ILot): IActivity[] => {
  const events: IActivity[] = [activity({ id: `reception-${lot.id}`, kind: 'reception', at: lot.receivedAt, by: lot.receivedBy, subject: lot.clientName, params: { code: lot.code, variety: lot.variety }, kg: lot.netKg, to: lotLink(lot) })];
  lot.moves.forEach((move, index) => {
    if (move.status === 'pressing') events.push(activity({ id: `pressing-${lot.id}-${index}`, kind: 'pressing', at: move.at, by: move.by, subject: lot.clientName, params: { code: lot.code }, to: lotLink(lot) }));
    if (move.status === 'pressed') events.push(activity({ id: `pressed-${lot.id}-${index}`, kind: 'pressed', at: move.at, by: move.by, subject: lot.clientName, params: { code: lot.code }, litres: lot.oilLitres, to: lotLink(lot) }));
    if (move.status === 'withdrawn') events.push(activity({ id: `withdrawal-${lot.id}-${index}`, kind: 'withdrawal', at: move.at, by: move.by, subject: lot.clientName, params: { code: lot.code }, litres: lot.withdrawnLitres, to: lotLink(lot) }));
  });
  lot.storages.forEach((storage) => events.push(activity({ id: `stored-${storage.id}`, kind: 'stored', at: storage.from, by: storage.by, subject: lot.clientName, params: { code: lot.code, tankId: storage.tankId }, litres: storage.litres, to: lotLink(lot) })));
  if (lot.discount) {
    const { discount } = lot;
    events.push(activity({ id: `discount-${lot.id}`, kind: discount.state === 'applied' ? 'discount_given' : 'discount_pending', at: discount.givenAt, by: discount.givenBy, subject: lot.clientName, params: { code: lot.code, percent: discount.percent }, amount: discount.amountDh, to: lotLink(lot) }));
    if (discount.decidedAt && discount.decidedBy && (discount.state === 'approved' || discount.state === 'refused')) {
      events.push(activity({ id: `discount-decision-${lot.id}`, kind: discount.state === 'approved' ? 'discount_approved' : 'discount_refused', at: discount.decidedAt, by: discount.decidedBy, subject: lot.clientName, params: { code: lot.code, percent: discount.percent }, amount: discount.amountDh, to: lotLink(lot) }));
    }
  }
  return events;
};

const DECISION_KINDS: Partial<Record<IMovement['status'], ActivityKind>> = { confirmed: 'payment_confirmed', rejected: 'payment_rejected', cancelled: 'payment_cancelled' };

const movementEvents = (movement: IMovement): IActivity[] => {
  const link = { name: 'finance', query: { movement: movement.id } };
  const params = { code: movement.code, method: movement.method };
  const events = [activity({ id: `recorded-${movement.id}`, kind: 'payment_recorded', at: movement.recordedAt, by: movement.recordedBy, subject: movement.client, params, amount: movement.amount, to: link })];
  const decided = DECISION_KINDS[movement.status];
  if (decided && movement.decidedAt && movement.decidedBy && movement.decidedAt !== movement.recordedAt) {
    events.push(activity({ id: `decided-${movement.id}`, kind: decided, at: movement.decidedAt, by: movement.decidedBy, subject: movement.client, params, amount: movement.amount, to: link }));
  }
  if (decided === 'payment_confirmed' && movement.decidedAt === movement.recordedAt) events[0] = { ...events[0], kind: 'payment_confirmed' };
  return events;
};

const refundEvents = (refund: IRefund): IActivity[] => {
  const link = { name: 'finance', query: { tab: 'refunds' } };
  const events: IActivity[] = [];
  if (refund.madeAt && refund.madeBy) events.push(activity({ id: `refund-made-${refund.id}`, kind: 'refund_made', at: refund.madeAt, by: refund.madeBy, subject: refund.client, params: { code: refund.sourceCode }, amount: refund.amount, to: link }));
  if (refund.confirmedAt && refund.confirmedBy) events.push(activity({ id: `refund-confirmed-${refund.id}`, kind: 'refund_confirmed', at: refund.confirmedAt, by: refund.confirmedBy, subject: refund.client, params: { code: refund.sourceCode }, amount: refund.amount, to: link }));
  return events;
};

/** Everything done on one Site on one day, newest first, read from the records each event comes from. */
export const buildActivityFeed = (sources: IActivitySources, day: string): IActivity[] => {
  const events = [
    ...sources.lots.flatMap(lotEvents),
    ...sources.movements.flatMap(movementEvents),
    ...sources.refunds.flatMap(refundEvents),
    ...sources.debtContacts.map((contact) =>
      activity({ id: `debt-${contact.id}`, kind: 'debt_contact', at: contact.at, by: contact.by, subject: sources.clientNames[contact.clientId] ?? '', params: { contact: contact.kind, promisedOn: contact.promisedOn ?? '' }, to: { name: 'debt-follow-up' } }),
    ),
    ...sources.configurationChanges.map((change) => activity({ id: `configuration-${change.id}-${change.key}`, kind: 'configuration', at: change.at, by: change.by, subject: change.key, params: { key: change.key }, to: { name: 'configuration' } })),
  ];
  return events.filter((event) => toIsoDate(event.at) === day).sort((first, second) => second.at.localeCompare(first.at));
};

/** The day at a glance: what came in, what was pressed and stored, what was given off and taken in. */
export const daySummary = (events: readonly IActivity[]): { receptions: number; receivedKg: number; storedLitres: number; discounts: number; discountDh: number; collectedDh: number } => ({
  receptions: events.filter((event) => event.kind === 'reception').length,
  receivedKg: events.filter((event) => event.kind === 'reception').reduce((sum, event) => sum + (event.kg ?? 0), 0),
  storedLitres: events.filter((event) => event.kind === 'stored').reduce((sum, event) => sum + (event.litres ?? 0), 0),
  discounts: events.filter((event) => event.kind === 'discount_given' || event.kind === 'discount_pending').length,
  discountDh: events.filter((event) => event.kind === 'discount_given' || event.kind === 'discount_approved').reduce((sum, event) => sum + (event.amount ?? 0), 0),
  collectedDh: events.filter((event) => event.kind === 'payment_confirmed').reduce((sum, event) => sum + (event.amount ?? 0), 0),
});
