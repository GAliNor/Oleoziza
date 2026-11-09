import { mockReject, mockResolve } from 'global/services/mock';
import { LOTS_MOCK_DB, notifyClient, syncLotPayments } from 'lot/services/lot.mock';
import { CLIENTS_MOCK_DB } from 'client/services/client.mock';
import { surplusOf } from 'finance/composables/settle';
import { DEBT_CONTACTS_MOCK, MOVEMENTS_MOCK, REFUNDS_MOCK } from 'finance/constants/mock-movements';
import { millingSales } from 'finance/composables/milling-figures';
import { formatWeekday, todayIso } from 'global/composables/date';
import { i18n } from '~/plugins/i18n';
import { ALL_SITES } from 'site/constants/site';
import type { IDebtContact, IDebtContactPayload, IFinanceService, ILotPaymentLink, IMovement, IMovementDecision, IPaymentDocument, IRecordPaymentPayload, IRefund, ISales, Settlement } from 'finance/types/finance';
import type { PeriodKey } from 'global/types/period';

export const MOVEMENTS_DB: IMovement[] = structuredClone(MOVEMENTS_MOCK);

export const REFUNDS_DB: IRefund[] = structuredClone(REFUNDS_MOCK);

export const DEBT_CONTACTS_DB: IDebtContact[] = structuredClone(DEBT_CONTACTS_MOCK);

let lastCode = 400 + MOVEMENTS_DB.length;

/** Turns money the mill holds into a Credit Note on the Client's balance, or a Refund to make. */
const settle = (movement: IMovement, settlement: Settlement, amount: number): void => {
  if (settlement === 'refund') {
    REFUNDS_DB.unshift({ id: `refund-${movement.id}`, siteId: movement.siteId, clientId: movement.clientId, client: movement.client, sourceCode: movement.code, amount, status: 'to_make', createdAt: new Date().toISOString(), documents: [] });
    return;
  }
  const client = CLIENTS_MOCK_DB.find((item) => item.id === movement.clientId);
  if (client) client.creditDh += amount;
};

const tellClient = (movement: IMovement): void => {
  movement.lotLinks.forEach((link) => {
    const lot = LOTS_MOCK_DB.find((item) => item.id === link.lotId);
    if (lot) notifyClient(lot, 'payment_confirmed');
  });
};

export default class FinanceMockService implements IFinanceService {
  getMovements(siteId: string): Promise<IMovement[]> {
    return mockResolve(siteId === ALL_SITES ? MOVEMENTS_DB : MOVEMENTS_DB.filter((movement) => movement.siteId === siteId));
  }

  decideMovement(id: string, decision: IMovementDecision): Promise<IMovement> {
    const movement = MOVEMENTS_DB.find((candidate) => candidate.id === id);
    if (!movement) return mockReject(new Error('movement_not_found'));
    if (movement.status === decision.status) return mockResolve(movement);
    const isAllowed = decision.status === 'cancelled' ? movement.status === 'confirmed' && movement.kind === 'payment' : movement.status === 'pending';
    if (!isAllowed) return mockReject(new Error('movement_not_decidable'));
    if (decision.status === 'confirmed' && !movement.lotLinks.length) return mockReject(new Error('movement_not_linked'));
    const surplus = surplusOf(movement);
    if (decision.status === 'confirmed' && surplus > 0 && !decision.settlement) return mockReject(new Error('surplus_not_settled'));
    const heldBeforeCancel = movement.amount;
    Object.assign(movement, { status: decision.status, note: decision.note, settlement: decision.settlement, decidedBy: decision.by, decidedAt: new Date().toISOString() });
    syncLotPayments(MOVEMENTS_DB);
    if (decision.status === 'confirmed') tellClient(movement);
    if (decision.status === 'confirmed' && surplus > 0 && decision.settlement) settle(movement, decision.settlement, surplus);
    if (decision.status === 'cancelled' && decision.settlement) settle(movement, decision.settlement, heldBeforeCancel);
    return mockResolve(movement);
  }

  linkLots(id: string, lotLinks: ILotPaymentLink[]): Promise<IMovement> {
    const movement = MOVEMENTS_DB.find((candidate) => candidate.id === id);
    if (!movement) return mockReject(new Error('movement_not_found'));
    if (movement.status !== 'pending') return mockReject(new Error('movement_not_pending'));
    movement.lotLinks = lotLinks;
    syncLotPayments(MOVEMENTS_DB);
    return mockResolve(movement);
  }

  addDocuments(id: string, documents: IPaymentDocument[]): Promise<IMovement> {
    const movement = MOVEMENTS_DB.find((candidate) => candidate.id === id);
    if (!movement) return mockReject(new Error('movement_not_found'));
    const known = new Set(movement.documents.map((document) => document.id));
    movement.documents.push(...documents.filter((document) => !known.has(document.id)));
    return mockResolve(movement);
  }

  getRefunds(siteId: string): Promise<IRefund[]> {
    return mockResolve(siteId === ALL_SITES ? REFUNDS_DB : REFUNDS_DB.filter((refund) => refund.siteId === siteId));
  }

  makeRefund(id: string, made: Pick<IRefund, 'method' | 'reference' | 'documents' | 'madeBy'>): Promise<IRefund> {
    const refund = REFUNDS_DB.find((candidate) => candidate.id === id);
    if (!refund) return mockReject(new Error('refund_not_found'));
    if (refund.status === 'to_make') Object.assign(refund, made, { status: 'made', madeAt: new Date().toISOString() });
    return mockResolve(refund);
  }

  confirmRefund(id: string, by: string): Promise<IRefund> {
    const refund = REFUNDS_DB.find((candidate) => candidate.id === id);
    if (!refund) return mockReject(new Error('refund_not_found'));
    if (refund.status === 'to_make' || refund.madeBy === by) return mockReject(new Error('refund_not_confirmable'));
    if (refund.status === 'made') Object.assign(refund, { status: 'confirmed', confirmedBy: by, confirmedAt: new Date().toISOString() });
    return mockResolve(refund);
  }

  recordPayment(payload: IRecordPaymentPayload): Promise<IMovement> {
    const existing = MOVEMENTS_DB.find((movement) => movement.id === payload.id);
    if (existing) return mockResolve(existing);
    const { isFinal, ...fields } = payload;
    const recordedAt = new Date().toISOString();
    const movement: IMovement = {
      ...fields,
      code: `P-${String(lastCode++)}`,
      kind: 'payment',
      purpose: 'fee',
      status: isFinal ? 'confirmed' : 'pending',
      recordedAt,
      wasOffline: !navigator.onLine,
      ...(isFinal ? { decidedBy: payload.recordedBy, decidedAt: recordedAt } : {}),
    };
    MOVEMENTS_DB.unshift(movement);
    syncLotPayments(MOVEMENTS_DB);
    if (isFinal) tellClient(movement);
    return mockResolve(movement);
  }

  getSales(siteId: string, period: PeriodKey): Promise<ISales> {
    const lots = siteId === ALL_SITES ? LOTS_MOCK_DB : LOTS_MOCK_DB.filter((lot) => lot.siteId === siteId);
    const movements = siteId === ALL_SITES ? MOVEMENTS_DB : MOVEMENTS_DB.filter((movement) => movement.siteId === siteId);
    return mockResolve(millingSales(lots, movements, period, todayIso(), formatWeekday, i18n.global.t('finance.sales.weekPrefix')));
  }

  getDebtContacts(siteId: string): Promise<IDebtContact[]> {
    return mockResolve(siteId === ALL_SITES ? DEBT_CONTACTS_DB : DEBT_CONTACTS_DB.filter((contact) => contact.siteId === siteId));
  }

  addDebtContact(payload: IDebtContactPayload): Promise<IDebtContact> {
    const existing = DEBT_CONTACTS_DB.find((contact) => contact.id === payload.id);
    if (existing) return mockResolve(existing);
    const contact: IDebtContact = { ...payload, at: new Date().toISOString() };
    DEBT_CONTACTS_DB.unshift(contact);
    return mockResolve(contact);
  }
}
