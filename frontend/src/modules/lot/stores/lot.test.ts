import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
      announcedContainers: null,
      plate: '',
      origin: '',
      quality: [],
      note: '',
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
