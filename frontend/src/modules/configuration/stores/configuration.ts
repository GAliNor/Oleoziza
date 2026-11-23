import { defineStore } from 'pinia';

import { i18n } from '~/plugins/i18n';

import ConfigurationService from 'configuration/services/configuration';
import { useReceptionStore } from 'reception/stores/reception';
import { useSessionStore } from 'global/stores/session';
import { withStatus } from 'global/composables/with-status';
import { cachedLoad, LOAD_TTL_MS } from 'global/composables/cached-load';
import { readStorage, writeStorage } from 'global/composables/storage';
import { NOTIFICATION_CHANNELS_STORAGE_KEY } from 'configuration/constants/configuration';
import type { IConfiguration, IConfigurationStore, IConfigurationUpdate, INotificationChannelSetting, NotificationChannel } from 'configuration/types/configuration';

const configurationService = new ConfigurationService();

/** What a Configuration holds that belongs to no Season. */
const siteSettingsOf = ({ methods, boxCount, boxCapacityKg, tanks, pressLines, nextTankNumber, nextPressLineNumber, history }: IConfiguration): Partial<IConfiguration> => ({ methods, boxCount, boxCapacityKg, tanks, pressLines, nextTankNumber, nextPressLineNumber, history });

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
      const updated = await withStatus(this, 'isSaving', () => configurationService.update(siteId, { ...plain, by: useSessionStore().fullName }), { errorMessage: i18n.global.t('configuration.saveError') });
      if (!updated) return null;
      this.keep(updated);
      useReceptionStore().loadedSiteId = null;
      return updated;
    },
    /** Deletes a price version: the one before it applies again, so the Reception reads its settings again. */
    async deletePriceChange(siteId: string, changeId: string): Promise<IConfiguration | null> {
      const updated = await withStatus(this, 'isSaving', () => configurationService.deletePriceChange(siteId, changeId), { errorMessage: i18n.global.t('configuration.saveError') });
      if (!updated) return null;
      this.keep(updated);
      useReceptionStore().loadedSiteId = null;
      return updated;
    },
    /** Files a Configuration under its Season, and as the Site's current one when its Season is open or none is; Site settings are shared by every Season. */
    keep(configuration: IConfiguration): void {
      if (configuration.notificationChannels) this.keepChannels(configuration.notificationChannels);
      if (configuration.seasonId) this.bySeason[seasonKey(configuration.siteId, configuration.seasonId)] = configuration;
      const current = this.bySite[configuration.siteId];
      if (configuration.seasonStatus === 'open' || !configuration.seasonId || !current) this.bySite[configuration.siteId] = configuration;
      else this.bySite[configuration.siteId] = { ...current, ...siteSettingsOf(configuration) };
    },
  },
});
