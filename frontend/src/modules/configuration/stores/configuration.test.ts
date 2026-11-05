import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ConfigurationMockService from 'configuration/services/configuration.mock';
import { useConfigurationStore } from 'configuration/stores/configuration';
import { useReceptionStore } from 'reception/stores/reception';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { createId } from 'global/composables/crypto';

describe('the configuration store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await useConfigurationStore().fetchSites([SITE_OUJDA_ID, SITE_BERKANE_ID]);
  });

  it('sets a value on one Site only, and keeps who changed what in the history', async () => {
    const store = useConfigurationStore();
    const before = store.bySite[SITE_BERKANE_ID].millingRate;
    const updated = await store.update(SITE_OUJDA_ID, { id: createId(), value: { key: 'millingRate', amount: 0.62 } });
    expect([updated?.millingRate, updated?.history[0].key, updated?.history[0].value]).toEqual([0.62, 'millingRate', 0.62]);
    expect(store.bySite[SITE_BERKANE_ID].millingRate).toBe(before);
  });

  it('switches a Payment Method and records it', async () => {
    const updated = await useConfigurationStore().update(SITE_OUJDA_ID, { id: createId(), method: { key: 'cheque', isEnabled: false, needsProof: true } });
    expect(updated?.methods.find((method) => method.key === 'cheque')?.isEnabled).toBe(false);
    expect([updated?.history[0].key, updated?.history[0].method]).toEqual(['cheque', { isEnabled: false, needsProof: true }]);
  });

  it('records one change when a retry follows a lost response', async () => {
    const original = ConfigurationMockService.prototype.update;
    vi.spyOn(ConfigurationMockService.prototype, 'update').mockImplementationOnce(async function (this: ConfigurationMockService, siteId, update) {
      await original.call(this, siteId, update);
      throw new Error('timeout');
    });
    const store = useConfigurationStore();
    const before = store.bySite[SITE_OUJDA_ID].history.length;
    const change = { id: createId(), value: { key: 'oilPrice' as const, amount: 41 } };
    expect(await store.update(SITE_OUJDA_ID, change)).toBeNull();
    const retried = await store.update(SITE_OUJDA_ID, change);
    expect(retried?.history.length).toBe(before + 1);
  });

  it('makes the Reception read its settings again after a change', async () => {
    const receptionStore = useReceptionStore();
    receptionStore.loadedSiteId = SITE_OUJDA_ID;
    await useConfigurationStore().update(SITE_OUJDA_ID, { id: createId(), value: { key: 'discountLimit', amount: 12 } });
    expect(receptionStore.loadedSiteId).toBeNull();
  });
});
