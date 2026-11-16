import { defineStore } from 'pinia';

import ConfigurationService from 'configuration/services/configuration';
import { useReceptionStore } from 'reception/stores/reception';
import { useSessionStore } from 'global/stores/session';
import { withStatus } from 'global/composables/with-status';
import { cachedLoad, LOAD_TTL_MS } from 'global/composables/cached-load';
import type { IConfiguration, IConfigurationStore, IConfigurationUpdate } from 'configuration/types/configuration';

const configurationService = new ConfigurationService();

export const seasonKey = (siteId: string, seasonId: string): string => `${siteId}:${seasonId}`;

export const useConfigurationStore = defineStore('configuration', {
  state: (): IConfigurationStore => ({
    bySite: {},
    bySeason: {},
    isLoading: false,
    isSaving: false,
    hasError: false,
  }),
  actions: {
    /** Loads the Sites' Configurations for the open Season in one request, the one Reception, Payments and equipment pickers read. */
    async fetchSites(siteIds: string[]): Promise<void> {
      await this.load(siteIds);
    },
    /** Loads the Sites' prices for one Season in one request, for the Configuration page's agenda. */
    async fetchSeason(siteIds: string[], seasonId: string): Promise<void> {
      await this.load(siteIds, seasonId);
    },
    async load(siteIds: string[], seasonId?: string): Promise<void> {
      if (!siteIds.length) return;
      const key = `configuration:${[...siteIds].sort().join(',')}:${seasonId ?? 'open'}`;
      await withStatus(
        this,
        'isLoading',
        () =>
          cachedLoad(key, LOAD_TTL_MS.configuration, async () => {
            const loaded = await configurationService.getAll(siteIds, seasonId);
            loaded.forEach((configuration) => this.keep(configuration));
          }),
        { errorFlag: 'hasError' },
      );
    },
    /** A change applies to later Receptions: the Reception settings are read again. */
    async update(siteId: string, update: IConfigurationUpdate): Promise<IConfiguration | null> {
      const plain = { ...update, value: update.value && { ...update.value }, boxes: update.boxes && { ...update.boxes }, tanks: update.tanks?.map((tank) => ({ ...tank })), pressLines: update.pressLines?.map((line) => ({ ...line })) };
      const updated = await withStatus(this, 'isSaving', () => configurationService.update(siteId, { ...plain, by: useSessionStore().fullName }));
      if (!updated) return null;
      this.keep(updated);
      useReceptionStore().loadedSiteId = null;
      return updated;
    },
    async cancelPriceChange(siteId: string, changeId: string): Promise<IConfiguration | null> {
      const updated = await withStatus(this, 'isSaving', () => configurationService.cancelPriceChange(siteId, changeId));
      if (updated) this.keep(updated);
      return updated;
    },
    /** Files a Configuration under its Season, and as the Site's current one when its Season is open; Site settings are shared by every Season. */
    keep(configuration: IConfiguration): void {
      this.bySeason[seasonKey(configuration.siteId, configuration.seasonId)] = configuration;
      const current = this.bySite[configuration.siteId];
      if (configuration.seasonStatus === 'open' || !current) this.bySite[configuration.siteId] = configuration;
      else this.bySite[configuration.siteId] = { ...current, methods: configuration.methods, boxCount: configuration.boxCount, boxCapacityKg: configuration.boxCapacityKg, tanks: configuration.tanks, pressLines: configuration.pressLines, history: configuration.history };
    },
  },
});
