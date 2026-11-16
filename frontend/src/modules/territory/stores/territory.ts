import { defineStore } from 'pinia';

import TerritoryService from 'territory/services/territory';
import { cachedLoad, LOAD_TTL_MS } from 'global/composables/cached-load';
import { withStatus } from 'global/composables/with-status';
import { buildProvinceShapes, type IProvinceShapes } from 'territory/composables/province-shapes';
import type { IProvince, ITerritoryStore, ProvinceId } from 'territory/types/territory';

const territoryService = new TerritoryService();

/** The Oriental's Provinces and their towns: reference data, loaded once per session and kept by the browser for a day. */
export const useTerritoryStore = defineStore('territory', {
  state: (): ITerritoryStore => ({
    provinces: [],
    isLoading: false,
    hasError: false,
  }),
  getters: {
    findProvince:
      (state) =>
      (id: ProvinceId | null): IProvince | undefined =>
        state.provinces.find((province) => province.id === id),
    shapes: (state): IProvinceShapes => buildProvinceShapes(state.provinces),
  },
  actions: {
    async fetchProvinces(): Promise<void> {
      await withStatus(
        this,
        'isLoading',
        () =>
          cachedLoad('provinces', LOAD_TTL_MS.reference, async () => {
            this.provinces = await territoryService.getProvinces();
          }),
        { errorFlag: 'hasError' },
      );
    },
  },
});
