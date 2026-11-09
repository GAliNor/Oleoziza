import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LotMockService, { LOTS_MOCK_DB } from 'lot/services/lot.mock';
import { LOTS_MOCK } from 'lot/constants/mock-lots';
import { useLotStore } from 'lot/stores/lot';
import { useReceptionStore } from 'reception/stores/reception';
import { useSessionStore } from 'global/stores/session';
import { useSyncStore } from 'global/stores/sync';
import { fullFee, millingFee } from 'lot/composables/fee';
import { createId } from 'global/composables/crypto';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { pressingOn } from 'lot/composables/press-schedule';
import { CONFIGURATIONS_MOCK } from 'configuration/constants/mock-configuration';
import type { ILot } from 'lot/types/lot';

const lot = (id: string, status: ILot['status'], isPendingSync = false): ILot => ({ id, code: `L-${id}`, status, isPendingSync }) as ILot;

describe('lot store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('finds a Lot by code', () => {
    const lotStore = useLotStore();
    lotStore.lots = [lot('1', 'waiting'), lot('2', 'pressing')];
    expect([lotStore.lotByCode('L-2')?.id, lotStore.lotByCode('L-9')]).toEqual(['2', undefined]);
  });

  it('puts a new Lot first and replaces a known one', () => {
    const lotStore = useLotStore();
    lotStore.lots = [lot('1', 'waiting')];
    lotStore.upsertLot(lot('2', 'waiting'));
    lotStore.upsertLot(lot('1', 'pressing'));
    expect(lotStore.lots.map((item) => [item.id, item.status])).toEqual([['2', 'waiting'], ['1', 'pressing']]);
  });

  it('reports how many Lots wait to sync', () => {
    const lotStore = useLotStore();
    lotStore.upsertLot(lot('1', 'waiting', true));
    lotStore.upsertLot(lot('2', 'waiting'));
    expect(useSyncStore().pendingCount).toBe(1);
  });
});

describe('a Reception seen through the lot store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.stubGlobal('navigator', { onLine: true });
    await useReceptionStore().fetchSite(SITE_OUJDA_ID);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the received Lot at once, waiting, with its net weight', async () => {
    const lotStore = useLotStore();
    const received = await useReceptionStore().receiveLot({
      id: createId(),
      siteId: SITE_OUJDA_ID,
      clientId: CLIENTS_MOCK[1].id,
      mode: 'service',
      variety: 'Haouzia',
      netKg: 250,
      millingRatePerKg: 0.5,
      notificationChoice: 'none',
      isContactMissing: false,
      boxNumbers: [3],
      pressLineId: 'oj-line-1',
      plannedStartAt: '2026-11-09T14:00:00.000Z',
    });
    expect(lotStore.lots[0].id).toBe(received?.id);
    expect([lotStore.lots[0].status, lotStore.lots[0].netKg]).toEqual(['waiting', 250]);
  });
});

describe('moving a Lot', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.stubGlobal('navigator', { onLine: true });
    await useLotStore().fetchLots(SITE_OUJDA_ID, true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const lotAt = (status: ILot['status']): ILot => {
    const found = useLotStore().lots.find((item) => item.status === status);
    if (!found) throw new Error(`no ${status} Lot in the mock`);
    return found;
  };

  /** A Press Line presses one Lot at a time: a free one, after finishing a Lot if every Line is busy. */
  const freeLine = async (): Promise<string> => {
    const lines = CONFIGURATIONS_MOCK[SITE_OUJDA_ID].pressLines.map((line) => line.id);
    const free = lines.find((lineId) => !pressingOn(LOTS_MOCK_DB, lineId));
    if (free) return free;
    const pressing = useLotStore().lots.find((item) => item.status === 'pressing') as ILot;
    await useLotStore().moveLot(pressing, { id: createId(), oilLitres: 100 });
    return pressing.pressLineId as string;
  };

  /** A Lot in pressing, started on a free Line when the earlier tests have finished them all. */
  const pressingLot = async (): Promise<ILot> => {
    const found = useLotStore().lots.find((item) => item.status === 'pressing');
    if (found) return found;
    return (await useLotStore().moveLot(lotAt('waiting'), { id: createId(), pressLineId: await freeLine() })) as ILot;
  };

  it('moves a waiting Lot into pressing, on a free Press Line', async () => {
    const lotStore = useLotStore();
    const pressLineId = await freeLine();
    const updated = await lotStore.moveLot(lotAt('waiting'), { id: createId(), pressLineId });
    expect(updated?.pressLineId).toBe(pressLineId);
    expect(updated?.status).toBe('pressing');
    expect(lotStore.lotByCode(updated?.code ?? '')?.status).toBe('pressing');
  });

  it('records the oil when pressing ends, and a Lot handed over whole is withdrawn at once', async () => {
    const updated = await useLotStore().moveLot(await pressingLot(), { id: createId(), oilLitres: 300 });
    expect([updated?.status, updated?.oilLitres, updated?.withdrawnLitres, updated?.storages]).toEqual(['withdrawn', 300, 300, []]);
  });

  it('stores what is not handed over, in a Tank of the same variety, until the planned date', async () => {
    const pressing = await pressingLot();
    const tankId = CONFIGURATIONS_MOCK[pressing.siteId].tanks.at(-1)?.id as string;
    const free = !LOTS_MOCK_DB.some((other) => other.siteId === pressing.siteId && other.storages.some((storage) => storage.tankId === tankId && !storage.endedAt && other.variety !== pressing.variety));
    expect(free).toBe(true);
    const updated = await useLotStore().moveLot(pressing, { id: createId(), oilLitres: 300, handedLitres: 100, pours: [{ tankId, litres: 200 }], plannedUntil: '2026-12-15' });
    expect([updated?.status, updated?.withdrawnLitres]).toEqual(['pressed', 100]);
    expect(updated?.storages).toMatchObject([{ tankId, litres: 200, withdrawnLitres: 0, plannedUntil: '2026-12-15', endedAt: null }]);
    const withdrawn = await useLotStore().moveLot(updated as ILot, { id: createId() });
    expect(withdrawn?.storages[0]).toMatchObject({ withdrawnLitres: 200 });
    expect(withdrawn?.storages[0].endedAt).not.toBeNull();
  });

  it('refuses a split that loses litres', async () => {
    const pressing = await pressingLot();
    const tankId = CONFIGURATIONS_MOCK[pressing.siteId].tanks.at(-1)?.id as string;
    expect(await useLotStore().moveLot(pressing, { id: createId(), oilLitres: 300, handedLitres: 50, pours: [{ tankId, litres: 200 }] })).toBeNull();
  });

  it('records what left when the oil is withdrawn', async () => {
    const pressed = lotAt('pressed');
    const updated = await useLotStore().moveLot(pressed, { id: createId() });
    expect([updated?.status, updated?.withdrawnLitres]).toEqual(['withdrawn', pressed.oilLitres]);
  });

  it('tells the Client the oil is ready, or shows it could not, when pressing ends', async () => {
    const lotStore = useLotStore();
    const lot = await pressingLot();
    lot.notificationChoice = 'sms';
    LOTS_MOCK_DB.find((item) => item.id === lot.id)!.notificationChoice = 'sms';
    const updated = await lotStore.moveLot(lot, { id: createId(), oilLitres: 300 });
    expect(updated?.notifications.at(-1)).toMatchObject({ event: 'pressed', channel: 'sms', isFailed: false });
    LOTS_MOCK_DB.find((item) => item.id === lot.id)!.notificationChoice = 'none';
  });

  it('keeps the photo taken at a move on the step it reached', async () => {
    const lotStore = useLotStore();
    await lotStore.fetchLots(SITE_OUJDA_ID, true);
    const lot = lotStore.lots.find((item) => item.status === 'waiting') as ILot;
    const moved = await lotStore.moveLot(lot, { id: createId(), photoUrl: 'press.jpg', pressLineId: await freeLine() });
    expect([moved?.status, moved?.stepPhotos.pressing]).toEqual(['pressing', 'press.jpg']);
  });

  it('moves once when the same intent is retried after a lost response', async () => {
    const original = LotMockService.prototype.moveLot;
    vi.spyOn(LotMockService.prototype, 'moveLot').mockImplementationOnce(async function (this: LotMockService, lotId, move) {
      await original.call(this, lotId, move);
      throw new Error('timeout');
    });
    const lotStore = useLotStore();
    const lot = lotAt('waiting');
    const move = { id: createId(), pressLineId: await freeLine() };
    expect(await lotStore.moveLot(lot, move)).toBeNull();
    const retried = await lotStore.moveLot(lot, move);
    expect(retried?.status).toBe('pressing');
  });

  it('refuses to start a Lot on a Press Line already pressing another', async () => {
    const pressing = useLotStore().lots.find((item) => item.status === 'pressing') as ILot;
    expect(await useLotStore().moveLot(lotAt('waiting'), { id: createId(), pressLineId: pressing.pressLineId as string })).toBeNull();
  });

  it('refuses to move a Lot past withdrawn', async () => {
    expect(await useLotStore().moveLot(lotAt('withdrawn'), { id: createId() })).toBeNull();
  });
});

describe('deciding a Discount', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.stubGlobal('navigator', { onLine: true });
    const seeded = LOTS_MOCK_DB.find((item) => item.code === 'OJ-2627-0155')!;
    seeded.discount = { amountDh: 94, percent: 20, state: 'pending', givenBy: 'Hamid Zerrouki', givenAt: seeded.receivedAt };
    await useLotStore().fetchLots(SITE_OUJDA_ID, true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const pendingLot = (): ILot => useLotStore().pendingDiscountLots[0];

  const signIn = (firstName: string, lastName: string, isOwner = false): void =>
    useSessionStore().setSession({ userId: 'u', sid: 's', role: 'management', isOwner, sites: {}, firstName, lastName, expiresAt: 0 });

  it('lowers the fee when approved', async () => {
    signIn('Dr', 'Taibi');
    const lot = pendingLot();
    const updated = await useLotStore().decideDiscount(lot, { id: createId(), isApproved: true });
    expect(updated?.discount?.state).toBe('approved');
    expect(millingFee(updated as ILot)).toBe(fullFee(lot) - (lot.discount?.amountDh ?? 0));
    expect(updated?.discount?.decidedBy).toBe('Dr Taibi');
  });

  it('keeps the full price when refused, with the reason', async () => {
    signIn('Dr', 'Taibi');
    const lot = pendingLot();
    const updated = await useLotStore().decideDiscount(lot, { id: createId(), isApproved: false, reason: 'Trop élevée' });
    expect([updated?.discount?.state, updated?.discount?.refusalReason, millingFee(updated as ILot)]).toEqual(['refused', 'Trop élevée', fullFee(lot)]);
  });

  it('does not let someone decide their own Discount', async () => {
    const lot = pendingLot();
    const [firstName, ...rest] = (lot.discount?.givenBy ?? '').split(' ');
    signIn(firstName, rest.join(' '));
    expect(await useLotStore().decideDiscount(lot, { id: createId(), isApproved: true })).toBeNull();
  });

  it('lets the Owner decide their own Discount', async () => {
    const lot = pendingLot();
    const [firstName, ...rest] = (lot.discount?.givenBy ?? '').split(' ');
    signIn(firstName, rest.join(' '), true);
    expect((await useLotStore().decideDiscount(lot, { id: createId(), isApproved: true }))?.discount?.state).toBe('approved');
  });
});

describe('the mock Lots', () => {
  it('all reach waiting at their Reception', () => {
    LOTS_MOCK.forEach((item) => expect(item.moves[0]).toMatchObject({ status: 'waiting', at: item.receivedAt }));
  });

  it('all belong to a known Client', () => {
    expect(LOTS_MOCK.filter((item) => !item.clientId).map((item) => item.clientName)).toEqual([]);
  });

  it('never repeat a code', () => {
    const codes = LOTS_MOCK.map((item) => item.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
