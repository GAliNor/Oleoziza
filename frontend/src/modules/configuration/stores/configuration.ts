import { defineStore } from 'pinia';

import ConfigurationService from 'configuration/services/configuration';
import { useReceptionStore } from 'reception/stores/reception';
import { useSessionStore } from 'global/stores/session';
import { withStatus } from 'global/composables/with-status';
import { cachedLoad, LOAD_TTL_MS } from 'global/composables/cached-load';
import { readStorage, writeStorage } from 'global/composables/storage';
import { NOTIFICATION_CHANNELS_STORAGE_KEY } from 'configuration/constants/configuration';
import type { IConfiguration, IConfigurationStore, IConfigurationUpdate, INotificationChannelSetting, NotificationChannel } from 'configuration/types/configuration';

const configurationService = new ConfigurationService();

export const seasonKey = (siteId: string, seasonId: string): string => `${siteId}:${seasonId}`;

export const useConfigurationStore = defineStore('configuration', {
  state: (): IConfigurationStore => ({
    bySite: {},
    bySeason: {},
    notificationChannels: readStorage<INotificationChannelSetting[] | null>(NOTIFICATION_CHANNELS_STORAGE_KEY, null),
    isLoading: false,
    isSaving: false,
    hasError: false,
  }),
  getters: {
    /** Channels Reception may offer: implemented and switched on, in the fixed order WhatsApp, SMS, email. */
    enabledNotificationChannels: (state): NotificationChannel[] => (state.notificationChannels ?? []).filter((item) => item.isImplemented && item.isEnabled).map((item) => item.channel),
  },
  actions: {
    async updateNotificationChannel(channel: NotificationChannel, isEnabled: boolean): Promise<boolean> {
      const updated = await withStatus(this, 'isSaving', () => configurationService.updateNotificationChannel(channel, isEnabled));
      if (updated) this.keepChannels(updated);
      return Boolean(updated);
    },
    /** Every Configuration answer carries the channels, so Configuration and Reception never ask for them apart; kept on the device for an Operator offline. */
    keepChannels(channels: INotificationChannelSetting[]): void {
      this.notificationChannels = channels;
      writeStorage(NOTIFICATION_CHANNELS_STORAGE_KEY, channels);
    },
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
      if (configuration.notificationChannels) this.keepChannels(configuration.notificationChannels);
      this.bySeason[seasonKey(configuration.siteId, configuration.seasonId)] = configuration;
      const current = this.bySite[configuration.siteId];
      if (configuration.seasonStatus === 'open' || !current) this.bySite[configuration.siteId] = configuration;
      else this.bySite[configuration.siteId] = { ...current, methods: configuration.methods, boxCount: configuration.boxCount, boxCapacityKg: configuration.boxCapacityKg, tanks: configuration.tanks, pressLines: configuration.pressLines, history: configuration.history };
    },
  },
});
