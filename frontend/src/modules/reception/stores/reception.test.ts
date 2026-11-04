import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReceptionMockService from 'reception/services/reception.mock';
import ClientMockService from 'client/services/client.mock';
import { useReceptionStore } from 'reception/stores/reception';
import { useLotStore } from 'lot/stores/lot';
import { useClientStore } from 'client/stores/client';
import { createWeighingDraft } from 'reception/composables/weighing';
import { createId } from 'global/composables/crypto';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { SITE_OUJDA_ID } from 'site/constants/mock-sites';

const RECEIVED_LOT_CODE = 'OJ-2627-0158';

const loseFirstResponse = <K extends 'openReception' | 'addWeighing' | 'finishReception'>(method: K): void => {
  const original = ReceptionMockService.prototype[method];
  vi.spyOn(ReceptionMockService.prototype, method).mockImplementationOnce(async function (this: ReceptionMockService, ...args: never[]) {
    await (original as (...params: never[]) => Promise<unknown>).apply(this, args);
    throw new Error('timeout');
  } as never);
};

describe('reception store retries', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.stubGlobal('navigator', { onLine: true });
    await useReceptionStore().fetchSite(SITE_OUJDA_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('records one Weighing when the same draft is retried after a lost response', async () => {
    const receptionStore = useReceptionStore();
    const lotStore = useLotStore();
    const lot = lotStore.lotByCode(RECEIVED_LOT_CODE)!;
    const weighingsBefore = lot.weighings.length;
    const draft = { ...createWeighingDraft('net'), netKgTyped: 250 };
    loseFirstResponse('addWeighing');

    expect(await receptionStore.addWeighing(lot, draft)).toBeNull();
    const retried = await receptionStore.addWeighing(lot, draft);

    expect(retried?.weighings.length).toBe(weighingsBefore + 1);
  });

  it('opens one Lot when the same Reception is retried after a lost response', async () => {
    const receptionStore = useReceptionStore();
    const payload = {
      id: createId(),
      siteId: SITE_OUJDA_ID,
      clientId: CLIENTS_MOCK[1].id,
      mode: 'service' as const,
      variety: 'Haouzia',
      boxNumbers: [3],
    };
    loseFirstResponse('openReception');

    expect(await receptionStore.openReception(payload)).toBeNull();
    const retried = await receptionStore.openReception(payload);

    expect(useLotStore().lots.filter((lot) => lot.id === payload.id)).toHaveLength(1);
    expect(retried?.id).toBe(payload.id);
  });

  it.each(['openReception', 'addWeighing', 'finishReception'] as const)('receives one Lot with one Weighing when %s loses its response', async (step) => {
    const receptionStore = useReceptionStore();
    const payload = { id: createId(), siteId: SITE_OUJDA_ID, clientId: CLIENTS_MOCK[1].id, mode: 'service' as const, variety: 'Haouzia', boxNumbers: [3, 4] };
    const weighing = { ...createWeighingDraft('net'), netKgTyped: 1840 };
    loseFirstResponse(step);

    expect(await receptionStore.receiveLot(payload, weighing)).toBeNull();
    const received = await receptionStore.receiveLot(payload, weighing);

    expect(useLotStore().lots.filter((lot) => lot.id === payload.id)).toHaveLength(1);
    expect([received?.status, received?.netKg, received?.weighings.length, received?.boxNumbers]).toEqual(['waiting', 1840, 1, [3, 4]]);
  });

  it('keeps the photo taken at the Reception on its first step', async () => {
    const payload = { id: createId(), siteId: SITE_OUJDA_ID, clientId: CLIENTS_MOCK[1].id, mode: 'service' as const, variety: 'Haouzia', boxNumbers: [3], photoUrl: 'olives.jpg' };
    const opened = await useReceptionStore().openReception(payload);
    expect(opened?.stepPhotos).toEqual({ reception: 'olives.jpg' });
  });

  it('creates one Client when the same form is retried after a lost response', async () => {
    const original = ClientMockService.prototype.create;
    vi.spyOn(ClientMockService.prototype, 'create').mockImplementationOnce(async function (this: ClientMockService, payload) {
      await original.call(this, payload);
      throw new Error('timeout');
    });
    const clientStore = useClientStore();
    const payload = { id: createId(), kind: 'individual' as const, name: 'Rachid Ouali', phone: '+212661000001', siteId: SITE_OUJDA_ID, identifier: null, email: null, location: { province: 'jerada' as const, city: 'Jerada', address: 'Hay Al Qods' } };

    expect(await clientStore.createClient(payload)).toBeNull();
    await clientStore.createClient(payload);
    await clientStore.fetchClients(true);

    expect(clientStore.clients.filter((client) => client.id === payload.id)).toHaveLength(1);
  });
});
