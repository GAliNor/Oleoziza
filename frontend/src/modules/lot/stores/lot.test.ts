import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LotMockService from 'lot/services/lot.mock';
import { LOTS_MOCK } from 'lot/constants/mock-lots';
import { useLotStore } from 'lot/stores/lot';
import { useReceptionStore } from 'reception/stores/reception';
import { useSyncStore } from 'global/stores/sync';
import { createWeighingDraft } from 'reception/composables/weighing';
import { createId } from 'global/composables/crypto';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { ILot } from 'lot/types/lot';

const lot = (id: string, status: ILot['status'], isPendingSync = false): ILot => ({ id, code: `L-${id}`, status, isPendingSync }) as ILot;

describe('lot store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('reads received Lots and finds a Lot by code', () => {
    const lotStore = useLotStore();
    lotStore.lots = [lot('1', 'received'), lot('2', 'pressing')];
    expect([lotStore.receivedLots.map((item) => item.id), lotStore.lotByCode('L-2')?.id, lotStore.lotByCode('L-9')]).toEqual([['1'], '2', undefined]);
  });

  it('puts a new Lot first and replaces a known one', () => {
    const lotStore = useLotStore();
    lotStore.lots = [lot('1', 'received')];
    lotStore.upsertLot(lot('2', 'received'));
    lotStore.upsertLot(lot('1', 'waiting'));
    expect(lotStore.lots.map((item) => [item.id, item.status])).toEqual([['2', 'received'], ['1', 'waiting']]);
  });

  it('reports how many Lots wait to sync', () => {
    const lotStore = useLotStore();
    lotStore.upsertLot(lot('1', 'received', true));
    lotStore.upsertLot(lot('2', 'received'));
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

  it('shows the opened Lot at once, then its Weighing, then moves it out of the received queue', async () => {
    const lotStore = useLotStore();
    const receptionStore = useReceptionStore();
    const opened = await receptionStore.openReception({
      id: createId(),
      siteId: SITE_OUJDA_ID,
      clientId: CLIENTS_MOCK[1].id,
      mode: 'service',
      variety: 'Haouzia',
      boxNumbers: [3],
    });
    expect(lotStore.lots[0].id).toBe(opened?.id);
    expect(lotStore.receivedLots.map((item) => item.id)).toContain(opened?.id);

    await receptionStore.addWeighing(opened as ILot, { ...createWeighingDraft('net'), netKgTyped: 250 });
    expect(lotStore.lotByCode(opened?.code ?? '')?.netKg).toBe(250);

    await receptionStore.finishReception(opened as ILot);
    expect(lotStore.lotByCode(opened?.code ?? '')?.status).toBe('waiting');
    expect(lotStore.receivedLots.map((item) => item.id)).not.toContain(opened?.id);
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

  it('moves a waiting Lot into pressing', async () => {
    const lotStore = useLotStore();
    const updated = await lotStore.moveLot(lotAt('waiting'), { id: createId() });
    expect(updated?.status).toBe('pressing');
    expect(lotStore.lotByCode(updated?.code ?? '')?.status).toBe('pressing');
  });

  it('records the oil when pressing ends', async () => {
    const updated = await useLotStore().moveLot(lotAt('pressing'), { id: createId(), oilKg: 300 });
    expect([updated?.status, updated?.oilKg]).toEqual(['pressed', 300]);
  });

  it('records what left when the oil is withdrawn', async () => {
    const pressed = lotAt('pressed');
    const updated = await useLotStore().moveLot(pressed, { id: createId() });
    expect([updated?.status, updated?.withdrawnKg]).toEqual(['withdrawn', pressed.oilKg]);
  });

  it('keeps the photo taken at a move on the step it reached', async () => {
    const lotStore = useLotStore();
    await lotStore.fetchLots(SITE_OUJDA_ID, true);
    const lot = lotStore.lots.find((item) => item.status === 'waiting') as ILot;
    const moved = await lotStore.moveLot(lot, { id: createId(), photoUrl: 'press.jpg' });
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
    const move = { id: createId() };
    expect(await lotStore.moveLot(lot, move)).toBeNull();
    const retried = await lotStore.moveLot(lot, move);
    expect(retried?.status).toBe('pressing');
  });

  it('refuses to move a Lot past withdrawn', async () => {
    expect(await useLotStore().moveLot(lotAt('withdrawn'), { id: createId() })).toBeNull();
  });
});

describe('the mock Lots', () => {
  it('all belong to a known Client', () => {
    expect(LOTS_MOCK.filter((item) => !item.clientId).map((item) => item.clientName)).toEqual([]);
  });

  it('never repeat a code', () => {
    const codes = LOTS_MOCK.map((item) => item.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
