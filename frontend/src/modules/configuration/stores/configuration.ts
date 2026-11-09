import { defineStore } from 'pinia';

import ConfigurationService from 'configuration/services/configuration';
import { useReceptionStore } from 'reception/stores/reception';
import { useSessionStore } from 'global/stores/session';
import { withStatus } from 'global/composables/with-status';
import type { IConfiguration, IConfigurationStore, IConfigurationUpdate } from 'configuration/types/configuration';

const configurationService = new ConfigurationService();

export const useConfigurationStore = defineStore('configuration', {
  state: (): IConfigurationStore => ({
    bySite: {},
    isLoading: false,
    isSaving: false,
    hasError: false,
  }),
  actions: {
    async fetchSites(siteIds: string[]): Promise<void> {
      await withStatus(
        this,
        'isLoading',
        async () => {
          const loaded = await Promise.all(siteIds.map((siteId) => configurationService.getOne(siteId)));
          loaded.forEach((configuration) => {
            this.bySite[configuration.siteId] = configuration;
          });
        },
        { errorFlag: 'hasError' },
      );
    },
    /** A change applies at once to later Receptions: the Reception settings are read again. */
    async update(siteId: string, update: IConfigurationUpdate): Promise<IConfiguration | null> {
      const plain = { ...update, boxes: update.boxes && { ...update.boxes }, tanks: update.tanks?.map((tank) => ({ ...tank })), pressLines: update.pressLines?.map((line) => ({ ...line })) };
      const updated = await withStatus(this, 'isSaving', () => configurationService.update(siteId, { ...plain, by: useSessionStore().fullName }));
      if (!updated) return null;
      this.bySite[siteId] = updated;
      useReceptionStore().loadedSiteId = null;
      return updated;
    },
  },
});
