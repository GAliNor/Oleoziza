import { mockReject, mockResolve } from 'global/services/mock';
import { createId } from 'global/composables/crypto';
import { todayIso } from 'global/composables/date';
import { LOTS_MOCK_DB } from 'lot/services/lot.mock';
import { SEASONS_MOCK_DB } from 'season/services/season.mock';
import { SEASON_CURRENT_ID, SEASON_PAST_ID } from 'season/constants/mock-seasons';
import { equipmentInUse } from 'configuration/composables/equipment';
import { CONFIGURATIONS_MOCK, DEFAULT_CONFIGURATION } from 'configuration/constants/mock-configuration';
import { NOTIFICATION_CHANNELS_MOCK } from 'configuration/constants/configuration';
import type { ISeason } from 'season/types/season';
import type { ConfigurationValueKey, IConfiguration, IConfigurationService, IConfigurationUpdatePayload, INotificationChannelSetting, IPriceChange, NotificationChannel } from 'configuration/types/configuration';

const VALUE_KEYS: ConfigurationValueKey[] = ['millingRate', 'discountLimit', 'oilPrice'];
const PAST_VALUES: Record<ConfigurationValueKey, number> = { millingRate: 0.45, discountLimit: 5, oilPrice: 36 };

const configurations: Record<string, IConfiguration> = structuredClone(CONFIGURATIONS_MOCK);
const priceChanges: Record<string, Omit<IPriceChange, 'isScheduled'>[]> = {};
let notificationChannels: INotificationChannelSetting[] = structuredClone([...NOTIFICATION_CHANNELS_MOCK]);

/** Whether the mock company may message Clients through a channel: implemented and switched on, as the backend decides at pressing. */
export const isChannelEnabledMock = (channel: NotificationChannel): boolean => notificationChannels.some((item) => item.channel === channel && item.isImplemented && item.isEnabled);

const startOf = (day: string): string => new Date(`${day}T00:00:00`).toISOString();

const changeKey = (siteId: string, seasonId: string): string => `${siteId}:${seasonId}`;

/** A Site's Configuration in the mock database, read by the other mock services too (its prices are the open Season's, in force now). */
export const configurationOf = (siteId: string): IConfiguration =>
  configurations[siteId] ?? (configurations[siteId] = { ...structuredClone(DEFAULT_CONFIGURATION), siteId });

const seedChanges = (siteId: string, season: ISeason): Omit<IPriceChange, 'isScheduled'>[] => {
  const site = configurationOf(siteId);
  if (season.id === SEASON_PAST_ID) {
    return [
      ...VALUE_KEYS.map((key) => ({ id: createId(), key, value: PAST_VALUES[key], effectiveFrom: startOf(season.startsOn), by: '' })),
      { id: createId(), key: 'oilPrice' as const, value: 38, effectiveFrom: startOf('2025-12-15'), by: '' },
    ];
  }
  if (season.id === SEASON_CURRENT_ID || season.status === 'planned') {
    return VALUE_KEYS.map((key) => ({ id: createId(), key, value: site[key], effectiveFrom: startOf(season.startsOn), by: '' }));
  }
  return [];
};

const changesOf = (siteId: string, season: ISeason): Omit<IPriceChange, 'isScheduled'>[] =>
  (priceChanges[changeKey(siteId, season.id)] ??= seedChanges(siteId, season));

const valueIn = (changes: Omit<IPriceChange, 'isScheduled'>[], key: ConfigurationValueKey, season: ISeason): number => {
  const limit = season.status === 'open' ? new Date().toISOString() : season.status === 'planned' ? startOf(season.startsOn) : '9999';
  const inForce = changes.filter((change) => change.key === key && change.effectiveFrom <= limit).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return inForce.at(-1)?.value ?? DEFAULT_CONFIGURATION[key];
};

const resolveSeason = (seasonId?: string): ISeason | undefined =>
  seasonId ? SEASONS_MOCK_DB.find((season) => season.id === seasonId) : SEASONS_MOCK_DB.find((season) => season.status === 'open');

const build = (siteId: string, season: ISeason): IConfiguration => {
  const changes = changesOf(siteId, season);
  const now = new Date().toISOString();
  return {
    ...configurationOf(siteId),
    seasonId: season.id,
    seasonLabel: season.label,
    seasonStatus: season.status,
    millingRate: valueIn(changes, 'millingRate', season),
    discountLimit: valueIn(changes, 'discountLimit', season),
    oilPrice: valueIn(changes, 'oilPrice', season),
    priceChanges: [...changes].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)).map((change) => ({ ...change, isScheduled: change.effectiveFrom > now })),
    notificationChannels: structuredClone(notificationChannels),
  };
};

export default class ConfigurationMockService implements IConfigurationService {
  getAll(siteIds: string[], seasonId?: string): Promise<IConfiguration[]> {
    const season = resolveSeason(seasonId);
    return season ? mockResolve(siteIds.map((siteId) => build(siteId, season))) : mockReject({ code: 'season_not_open' });
  }

  update(siteId: string, update: IConfigurationUpdatePayload): Promise<IConfiguration> {
    const configuration = configurationOf(siteId);
    const season = resolveSeason(update.seasonId);
    if (!season) return mockReject({ code: 'season_not_open' });
    if (configuration.history.some((change) => change.id === update.id)) return mockResolve(build(siteId, season));
    const at = new Date().toISOString();
    const inUse = equipmentInUse(LOTS_MOCK_DB, siteId);
    if (update.boxes && update.boxes.count < inUse.highestBox) return mockReject({ code: 'box_in_use' });
    if (update.tanks && configuration.tanks.some((tank) => inUse.tankIds.has(tank.id) && !update.tanks?.some((kept) => kept.id === tank.id))) return mockReject({ code: 'tank_in_use' });
    if (update.pressLines && configuration.pressLines.some((line) => inUse.lineIds.has(line.id) && !update.pressLines?.some((kept) => kept.id === line.id))) return mockReject({ code: 'line_in_use' });
    if (update.boxes) {
      Object.assign(configuration, { boxCount: update.boxes.count, boxCapacityKg: update.boxes.capacityKg });
      configuration.history.unshift({ id: update.id, key: 'boxes', value: null, method: null, equipment: { boxCount: update.boxes.count, boxCapacityKg: update.boxes.capacityKg }, by: update.by, at });
    }
    if (update.tanks) {
      configuration.tanks = update.tanks;
      configuration.history.unshift({ id: update.id, key: 'tanks', value: null, method: null, equipment: { tanks: update.tanks }, by: update.by, at });
    }
    if (update.pressLines) {
      configuration.pressLines = update.pressLines;
      configuration.history.unshift({ id: update.id, key: 'pressLines', value: null, method: null, equipment: { pressLines: update.pressLines }, by: update.by, at });
    }
    if (update.value) {
      if (season.status === 'closed') return mockReject({ code: 'season_closed' });
      const day = update.value.effectiveOn ?? (season.status === 'open' ? todayIso() : season.startsOn);
      if (season.status === 'open' && day < todayIso()) return mockReject({ code: 'date_in_past' });
      const effectiveFrom = season.status === 'open' && day === todayIso() ? at : startOf(day);
      changesOf(siteId, season).push({ id: createId(), key: update.value.key, value: update.value.amount, effectiveFrom, by: update.by });
      if (season.status === 'open' && effectiveFrom <= at) configuration[update.value.key] = update.value.amount;
      configuration.history.unshift({ id: update.id, key: update.value.key, value: update.value.amount, method: null, by: update.by, at });
    }
    if (update.method) {
      const { key, isEnabled, needsProof } = update.method;
      configuration.methods = configuration.methods.map((method) => (method.key === key ? { key, isEnabled, needsProof } : method));
      configuration.history.unshift({ id: update.id, key, value: null, method: { isEnabled, needsProof }, by: update.by, at });
    }
    return mockResolve(build(siteId, season));
  }

  updateNotificationChannel(channel: NotificationChannel, isEnabled: boolean): Promise<INotificationChannelSetting[]> {
    const setting = notificationChannels.find((item) => item.channel === channel);
    if (!setting) return mockReject({ code: 'validation_error' });
    if (isEnabled && !setting.isImplemented) return mockReject({ code: 'notification_channel_not_implemented' });
    notificationChannels = notificationChannels.map((item) => (item.channel === channel ? { ...item, isEnabled } : item));
    return mockResolve(structuredClone(notificationChannels));
  }

  cancelPriceChange(siteId: string, changeId: string): Promise<IConfiguration> {
    const season = SEASONS_MOCK_DB.find((item) => (priceChanges[changeKey(siteId, item.id)] ?? []).some((change) => change.id === changeId));
    if (!season) return mockReject({ code: 'price_change_not_found' });
    const changes = changesOf(siteId, season);
    const change = changes.find((item) => item.id === changeId);
    if (!change || change.effectiveFrom <= new Date().toISOString()) return mockReject({ code: 'change_in_force' });
    changes.splice(changes.indexOf(change), 1);
    return mockResolve(build(siteId, season));
  }
}
