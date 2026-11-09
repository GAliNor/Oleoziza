import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { useReceptionStore } from 'reception/stores/reception';
import { LOTS_MOCK_DB } from 'lot/services/lot.mock';
import { equipmentInUse, nextNumber } from 'configuration/composables/equipment';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { createId } from 'global/composables/crypto';

describe('Boxes, Tanks and Press Lines in Configuration', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await useConfigurationStore().fetchSites([SITE_OUJDA_ID, SITE_BERKANE_ID]);
  });

  it('changes the Boxes and gives the new count to the Reception', async () => {
    const updated = await useConfigurationStore().update(SITE_BERKANE_ID, { id: createId(), boxes: { count: 30, capacityKg: 800 } });
    expect([updated?.boxCount, updated?.boxCapacityKg, updated?.history[0].key]).toEqual([30, 800, 'boxes']);
    await useReceptionStore().fetchSite(SITE_BERKANE_ID);
    expect([useReceptionStore().settings?.boxCount, useReceptionStore().settings?.boxCapacityKg]).toEqual([30, 800]);
  });

  it('refuses fewer Boxes than the highest one holding olives', async () => {
    const { highestBox } = equipmentInUse(LOTS_MOCK_DB, SITE_OUJDA_ID);
    expect(highestBox).toBeGreaterThan(1);
    expect(await useConfigurationStore().update(SITE_OUJDA_ID, { id: createId(), boxes: { count: highestBox - 1, capacityKg: 1000 } })).toBeNull();
  });

  it('adds a Tank with the next free number and keeps it in the history', async () => {
    const store = useConfigurationStore();
    const tanks = store.bySite[SITE_BERKANE_ID].tanks;
    const added = { id: createId(), number: nextNumber(tanks), capacityLitres: 5000 };
    const updated = await store.update(SITE_BERKANE_ID, { id: createId(), tanks: [...tanks, added] });
    expect(updated?.tanks.at(-1)).toEqual(added);
    expect(updated?.history[0].equipment?.tanks).toHaveLength(tanks.length + 1);
  });
});
