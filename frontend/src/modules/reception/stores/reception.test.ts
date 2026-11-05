import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReceptionMockService from 'reception/services/reception.mock';
import ClientMockService from 'client/services/client.mock';
import { useReceptionStore } from 'reception/stores/reception';
import { useLotStore } from 'lot/stores/lot';
import { useClientStore } from 'client/stores/client';
import { createId } from 'global/composables/crypto';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { SITE_OUJDA_ID } from 'site/constants/mock-sites';

const loseFirstResponse = (): void => {
  const original = ReceptionMockService.prototype.receiveLot;
  vi.spyOn(ReceptionMockService.prototype, 'receiveLot').mockImplementationOnce(async function (this: ReceptionMockService, payload) {
    await original.call(this, payload);
    throw new Error('timeout');
  });
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

  it('receives one Lot when the same Reception is retried after a lost response', async () => {
    const receptionStore = useReceptionStore();
    const payload = { id: createId(), siteId: SITE_OUJDA_ID, clientId: CLIENTS_MOCK[1].id, mode: 'service' as const, variety: 'Haouzia', netKg: 1840, millingRatePerKg: 0.5, discount: null, notificationChoice: 'none' as const, isContactMissing: false, boxNumbers: [3, 4] };
    loseFirstResponse();

    expect(await receptionStore.receiveLot(payload)).toBeNull();
    const received = await receptionStore.receiveLot(payload);

    expect(useLotStore().lots.filter((lot) => lot.id === payload.id)).toHaveLength(1);
    expect([received?.id, received?.status, received?.netKg, received?.boxNumbers, received?.moves.map((move) => move.status)]).toEqual([payload.id, 'waiting', 1840, [3, 4], ['waiting']]);
  });

  it('keeps the photo taken at the Reception on its first step', async () => {
    const payload = { id: createId(), siteId: SITE_OUJDA_ID, clientId: CLIENTS_MOCK[1].id, mode: 'service' as const, variety: 'Haouzia', netKg: 250, millingRatePerKg: 0.5, discount: null, notificationChoice: 'none' as const, isContactMissing: false, boxNumbers: [3], photoUrl: 'olives.jpg' };
    const received = await useReceptionStore().receiveLot(payload);
    expect(received?.stepPhotos).toEqual({ reception: 'olives.jpg' });
  });

  it('keeps a pending Discount and the Notification Choice on the Lot', async () => {
    const payload = { id: createId(), siteId: SITE_OUJDA_ID, clientId: CLIENTS_MOCK[1].id, mode: 'service' as const, variety: 'Haouzia', netKg: 1000, millingRatePerKg: 0.5, discount: { amountDh: 100, percent: 20, state: 'pending' as const }, notificationChoice: 'email' as const, isContactMissing: true, boxNumbers: [3] };
    const received = await useReceptionStore().receiveLot(payload);
    expect(received?.discount).toMatchObject({ amountDh: 100, percent: 20, state: 'pending' });
    expect([received?.notificationChoice, received?.isContactMissing, received?.millingRatePerKg]).toEqual(['email', true, 0.5]);
  });

  it('reads the rate and the limit from the configuration', () => {
    expect([useReceptionStore().settings?.millingRatePerKg, useReceptionStore().settings?.discountLimitPercent]).toEqual([0.5, 10]);
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
