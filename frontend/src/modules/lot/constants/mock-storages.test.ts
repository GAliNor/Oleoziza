import { describe, expect, it } from 'vitest';

import { LOTS_MOCK } from 'lot/constants/mock-lots';
import { CONFIGURATIONS_MOCK } from 'configuration/constants/mock-configuration';
import { tankStates } from 'lot/composables/storage';

describe('the seed Storages', () => {
  it('store every pressed Lot whole, so its oil is accounted for', () => {
    const pressed = LOTS_MOCK.filter((lot) => lot.status === 'pressed');
    expect(pressed.every((lot) => Math.abs(lot.storages.reduce((sum, storage) => sum + storage.litres, 0) - (lot.oilLitres ?? 0)) < 0.05)).toBe(true);
  });

  it.each(Object.entries(CONFIGURATIONS_MOCK))('keep one variety per Tank, within its capacity, on Site %s', (siteId, configuration) => {
    tankStates(configuration.tanks, LOTS_MOCK.filter((lot) => lot.siteId === siteId)).forEach((state) => {
      expect(new Set(state.entries.map((entry) => entry.lot.variety)).size).toBeLessThanOrEqual(1);
      expect(state.fillLitres).toBeLessThanOrEqual(state.tank.capacityLitres);
    });
  });
});
