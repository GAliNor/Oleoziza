import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FinanceMockService from 'finance/services/finance.mock';
import { useFinanceStore } from 'finance/stores/finance';
import { useLotStore } from 'lot/stores/lot';
import { useClientStore } from 'client/stores/client';
import { useReceptionStore } from 'reception/stores/reception';
import { useSessionStore } from 'global/stores/session';
import { surplusOf } from 'finance/composables/settle';
import { createId } from 'global/composables/crypto';
import { amountDue, millingFee, paymentStateOf } from 'lot/composables/fee';
import { MOVEMENTS_MOCK } from 'finance/constants/mock-movements';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { ALL_SITES } from 'site/constants/site';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { IMovement, IRefund, MovementStatus } from 'finance/types/finance';
import type { ILot } from 'lot/types/lot';

describe('finance store decisions', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await useFinanceStore().fetchMovements(ALL_SITES, true);
  });

  const movementWith = (status: MovementStatus, kind: IMovement['kind'] = 'payment'): IMovement => {
    const found = useFinanceStore().movements.find((item) => item.status === status && item.kind === kind);
    if (!found) throw new Error(`no ${status} ${kind} in the mock`);
    return found;
  };

  it('confirms a pending Payment and records who did it', async () => {
    const updated = await useFinanceStore().decide(movementWith('pending'), { status: 'confirmed' });
    expect(updated?.status).toBe('confirmed');
    expect(updated?.decidedAt).toBeTruthy();
    expect(useFinanceStore().movements.find((item) => item.id === updated?.id)?.status).toBe('confirmed');
  });

  it('confirming twice changes nothing the second time', async () => {
    const movement = movementWith('pending');
    const first = await useFinanceStore().decide(movement, { status: 'confirmed' });
    const second = await useFinanceStore().decide(movement, { status: 'confirmed' });
    expect(second?.decidedAt).toBe(first?.decidedAt);
  });

  it('keeps the reason of a rejection', async () => {
    const updated = await useFinanceStore().decide(movementWith('pending'), { status: 'rejected', note: 'Absent de la caisse' });
    expect([updated?.status, updated?.note]).toEqual(['rejected', 'Absent de la caisse']);
  });

  it('cancels a confirmed Payment as a Credit Note', async () => {
    const updated = await useFinanceStore().decide(movementWith('confirmed'), { status: 'cancelled', note: 'Chèque impayé', settlement: 'credit_note' });
    expect([updated?.status, updated?.settlement]).toEqual(['cancelled', 'credit_note']);
  });

  it('refuses to cancel a Payment still pending', async () => {
    expect(await useFinanceStore().decide(movementWith('pending'), { status: 'cancelled', note: 'x', settlement: 'refund' })).toBeNull();
  });
});

describe('recording a Payment', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.stubGlobal('navigator', { onLine: true });
    await useLotStore().fetchLots(SITE_OUJDA_ID, true);
    await useFinanceStore().fetchMovements(SITE_OUJDA_ID, true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const unpaidLot = (): ILot => useLotStore().lots.find((lot) => paymentStateOf(lot) === 'unpaid' && !lot.discount) as ILot;
  const payment = (lot: ILot, amount: number) => ({ id: createId(), siteId: lot.siteId, clientId: lot.clientId, client: lot.clientName, lotLinks: [{ lotId: lot.id, lotCode: lot.code, amount }], amount, method: 'cash' as const, documents: [] });
  const lotNow = (id: string): ILot => useLotStore().lots.find((lot) => lot.id === id) as ILot;

  it('puts a full Payment at À confirmer, then Payé once confirmed', async () => {
    const lot = unpaidLot();
    const movement = await useFinanceStore().recordPayment(payment(lot, millingFee(lot)));
    expect([movement?.status, paymentStateOf(lotNow(lot.id))]).toEqual(['pending', 'to_confirm']);
    await useFinanceStore().decide(movement as IMovement, { status: 'confirmed' });
    expect(paymentStateOf(lotNow(lot.id))).toBe('paid');
  });

  it('leaves a lower Payment at Partiel', async () => {
    const lot = unpaidLot();
    await useFinanceStore().recordPayment(payment(lot, 10));
    expect([paymentStateOf(lotNow(lot.id)), lotNow(lot.id).pendingDh]).toEqual(['partial', 10]);
  });

  it('puts the Lot back when the Payment is rejected', async () => {
    const lot = unpaidLot();
    const movement = await useFinanceStore().recordPayment(payment(lot, millingFee(lot)));
    await useFinanceStore().decide(movement as IMovement, { status: 'rejected', note: 'Absent' });
    expect(paymentStateOf(lotNow(lot.id))).toBe('unpaid');
  });

  it('records one Payment when a retry follows a lost response', async () => {
    const original = FinanceMockService.prototype.recordPayment;
    vi.spyOn(FinanceMockService.prototype, 'recordPayment').mockImplementationOnce(async function (this: FinanceMockService, sent) {
      await original.call(this, sent);
      throw new Error('timeout');
    });
    const lot = unpaidLot();
    const sent = payment(lot, 10);
    expect(await useFinanceStore().recordPayment(sent)).toBeNull();
    await useFinanceStore().recordPayment(sent);
    expect(lotNow(lot.id).pendingDh).toBe(10);
  });

  it('refuses to confirm a Payment with no Lot', async () => {
    const lot = unpaidLot();
    const movement = await useFinanceStore().recordPayment({ ...payment(lot, 10), lotLinks: [] });
    expect(await useFinanceStore().decide(movement as IMovement, { status: 'confirmed' })).toBeNull();
  });

  it('tells the Client when a Payment of a Lot with a Notification Choice is confirmed', async () => {
    const lot = useLotStore().lots.find((item) => item.notificationChoice === 'sms' && amountDue(item) > 0 && !item.discount) as ILot;
    const movement = await useFinanceStore().recordPayment(payment(lot, 10));
    await useFinanceStore().decide(movement as IMovement, { status: 'confirmed' });
    expect(lotNow(lot.id).notifications.at(-1)).toMatchObject({ event: 'payment_confirmed', channel: 'sms' });
  });
});

describe('a Payment received directly', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.stubGlobal('navigator', { onLine: true });
    await useLotStore().fetchLots(SITE_OUJDA_ID, true);
    await useFinanceStore().fetchMovements(SITE_OUJDA_ID, true);
    await useFinanceStore().fetchRefunds(SITE_OUJDA_ID);
    await useClientStore().fetchClients(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const unpaidLot = (): ILot => useLotStore().lots.find((lot) => paymentStateOf(lot) === 'unpaid' && !lot.discount) as ILot;
  const unlinked = (lot: ILot, amount: number) => ({ id: createId(), siteId: lot.siteId, clientId: lot.clientId, client: lot.clientName, lotLinks: [], amount, method: 'transfer' as const, documents: [] });

  it('can wait for its Lots, then be linked and confirmed', async () => {
    const lot = unpaidLot();
    const store = useFinanceStore();
    const movement = (await store.recordPayment(unlinked(lot, millingFee(lot)))) as IMovement;
    expect(await store.decide(movement, { status: 'confirmed' })).toBeNull();
    const linked = (await store.linkLots(movement, [{ lotId: lot.id, lotCode: lot.code, amount: millingFee(lot) }])) as IMovement;
    expect((await store.decide(linked, { status: 'confirmed' }))?.status).toBe('confirmed');
  });

  it('keeps each document once, shown under every Lot it pays', async () => {
    const lot = unpaidLot();
    const store = useFinanceStore();
    const movement = (await store.recordPayment(unlinked(lot, 10))) as IMovement;
    const document = { id: createId(), name: 'virement.pdf', url: 'data:', isPdf: true, addedBy: 'K', addedAt: '2026-11-05' };
    await store.addDocuments(movement, [document]);
    const updated = await store.addDocuments(movement, [document]);
    expect(updated?.documents.map((item) => item.name)).toEqual(['virement.pdf']);
  });

  it('must settle a surplus before it can be confirmed', async () => {
    const lot = unpaidLot();
    const store = useFinanceStore();
    const movement = (await store.recordPayment({ ...unlinked(lot, 1000), lotLinks: [{ lotId: lot.id, lotCode: lot.code, amount: 100 }] })) as IMovement;
    expect(surplusOf(movement)).toBe(900);
    expect(await store.decide(movement, { status: 'confirmed' })).toBeNull();
  });

  it('turns a surplus into an Avoir the next Lot takes off', async () => {
    const lot = unpaidLot();
    const store = useFinanceStore();
    const movement = (await store.recordPayment({ ...unlinked(lot, 300), lotLinks: [{ lotId: lot.id, lotCode: lot.code, amount: 100 }] })) as IMovement;
    const before = useClientStore().clientById(lot.clientId)?.creditDh ?? 0;
    await store.decide(movement, { status: 'confirmed', settlement: 'credit_note' });
    expect(useClientStore().clientById(lot.clientId)?.creditDh).toBe(before + 200);
    const received = await useReceptionStore().receiveLot({ id: createId(), siteId: lot.siteId, clientId: lot.clientId, mode: 'service', variety: 'Haouzia', netKg: 1000, millingRatePerKg: 0.5, discount: null, notificationChoice: 'none', isContactMissing: false, boxNumbers: [3] });
    expect(received?.creditDh).toBe(before + 200);
    expect(amountDue(received as ILot)).toBe(500 - (before + 200));
    expect(useClientStore().clientById(lot.clientId)?.creditDh).toBe(0);
  });

  it('turns a surplus into a Refund, which someone else must confirm', async () => {
    const lot = unpaidLot();
    const store = useFinanceStore();
    useSessionStore().setSession({ userId: 'k', sid: 's', role: 'accountant', isOwner: false, sites: {}, firstName: 'Khadija', lastName: 'Amrani', expiresAt: 0 });
    const movement = (await store.recordPayment({ ...unlinked(lot, 300), lotLinks: [{ lotId: lot.id, lotCode: lot.code, amount: 100 }] })) as IMovement;
    await store.decide(movement, { status: 'confirmed', settlement: 'refund' });
    const refund = store.refunds.find((item) => item.sourceCode === movement.code) as IRefund;
    expect([refund.amount, refund.status]).toEqual([200, 'to_make']);
    const made = (await store.makeRefund(refund, { method: 'cash', reference: 'R1', documents: [] })) as IRefund;
    expect(made.status).toBe('made');
    expect(await store.confirmRefund(made)).toBeNull();
    useSessionStore().setSession({ userId: 'o', sid: 's', role: 'management', isOwner: true, sites: {}, firstName: 'Dr', lastName: 'Taibi', expiresAt: 0 });
    expect((await store.confirmRefund(made))?.status).toBe('confirmed');
  });

  it('puts the Lots back and settles the whole amount when cancelled', async () => {
    const lot = unpaidLot();
    const store = useFinanceStore();
    const movement = (await store.recordPayment({ ...unlinked(lot, millingFee(lot)), lotLinks: [{ lotId: lot.id, lotCode: lot.code, amount: millingFee(lot) }] })) as IMovement;
    const confirmed = (await store.decide(movement, { status: 'confirmed' })) as IMovement;
    const before = useClientStore().clientById(lot.clientId)?.creditDh ?? 0;
    await store.decide(confirmed, { status: 'cancelled', note: 'Chèque impayé', settlement: 'credit_note' });
    expect(paymentStateOf(useLotStore().lots.find((item) => item.id === lot.id) as ILot)).toBe('unpaid');
    expect(useClientStore().clientById(lot.clientId)?.creditDh).toBe(before + millingFee(lot));
  });
});

describe('the mock figures', () => {
  it('keep the four figures adding up to the CA', async () => {
    const figures = (await new FinanceMockService().getSales(SITE_OUJDA_ID, 'season')).figures;
    expect(figures.revenue).toBeGreaterThan(0);
    expect(figures.collected + figures.pending + figures.outstanding).toBeCloseTo(figures.revenue);
  });

  it('give each Site a share of all Sites', async () => {
    const service = new FinanceMockService();
    const all = (await service.getSales(ALL_SITES, 'season')).figures.revenue;
    const sum = (await service.getSales(SITE_OUJDA_ID, 'season')).figures.revenue + (await service.getSales(SITE_BERKANE_ID, 'season')).figures.revenue;
    expect(sum).toBeCloseTo(all);
  });
});

describe('finance mock movements', () => {
  it('links every movement to a real Client, so the client tag always opens a page', () => {
    const clientIds = new Set(CLIENTS_MOCK.map((client) => client.id));
    expect(MOVEMENTS_MOCK.filter((movement) => !clientIds.has(movement.clientId))).toEqual([]);
  });

  it('names the bank account on every transfer and cheque', () => {
    const banked = MOVEMENTS_MOCK.filter((movement) => movement.method === 'transfer' || movement.method === 'cheque');
    expect(banked.filter((movement) => !movement.bankAccount)).toEqual([]);
  });
});
