import { shiftDate, todayIso } from 'global/composables/date';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { SEASON_CURRENT_ID } from 'season/constants/mock-seasons';
import { NOTIFICATION_CHANNELS_MOCK } from 'configuration/constants/configuration';
import type { IConfiguration, IConfigurationChange, IPressLineSetting, ITankSetting } from 'configuration/types/configuration';

const daysAgo = (days: number): string => `${shiftDate(todayIso(), -days)}T09:00:00+01:00`;

const change = (id: string, key: IConfigurationChange['key'], value: number, days: number, by = 'Mohammed Taibi'): IConfigurationChange => ({ id, key, value, method: null, by, at: daysAgo(days) });

/** Fixed UUIDs shared with the backend demo seed, so mocked Lots and the real Configuration point at the same Tanks and Press Lines. */
const SITE_EQUIPMENT_KEYS: Record<string, string> = { oj: '0001', bk: '0002' };

const equipmentId = (kind: '7a4c0000' | '11e00000', prefix: string, index: number): string => `${kind}-${SITE_EQUIPMENT_KEYS[prefix]}-4000-8000-${String(index + 1).padStart(12, '0')}`;

const tanks = (prefix: string, capacities: number[]): ITankSetting[] => capacities.map((capacityLitres, index) => ({ id: equipmentId('7a4c0000', prefix, index), number: index + 1, capacityLitres }));

const lines = (prefix: string, names: string[]): IPressLineSetting[] => names.map((name, index) => ({ id: equipmentId('11e00000', prefix, index), number: index + 1, name }));

export const CONFIGURATIONS_MOCK: Record<string, IConfiguration> = {
  [SITE_OUJDA_ID]: {
    siteId: SITE_OUJDA_ID,
    seasonId: SEASON_CURRENT_ID,
    seasonLabel: 'Saison 2026-2027',
    seasonStatus: 'open',
    priceChanges: [],
    millingRate: 0.5,
    discountLimit: 10,
    oilPrice: 40,
    methods: [
      { key: 'cash', isEnabled: true, needsProof: false },
      { key: 'cheque', isEnabled: true, needsProof: true },
      { key: 'transfer', isEnabled: true, needsProof: true },
      { key: 'oil', isEnabled: true, needsProof: false },
    ],
    boxCount: 24,
    boxCapacityKg: 1000,
    tanks: tanks('oj', [20000, 20000, 10000, 10000, 5000]),
    pressLines: lines('oj', ['', '', '', '', '']),
    nextTankNumber: 6,
    nextPressLineNumber: 6,
    notificationChannels: structuredClone([...NOTIFICATION_CHANNELS_MOCK]),
    history: [
      change('oj-rate-2', 'millingRate', 0.5, 12),
      change('oj-oil-2', 'oilPrice', 40, 12),
      change('oj-limit-1', 'discountLimit', 10, 40),
      change('oj-rate-1', 'millingRate', 0.45, 300),
      change('oj-oil-1', 'oilPrice', 36, 300),
    ],
  },
  [SITE_BERKANE_ID]: {
    siteId: SITE_BERKANE_ID,
    seasonId: SEASON_CURRENT_ID,
    seasonLabel: 'Saison 2026-2027',
    seasonStatus: 'open',
    priceChanges: [],
    millingRate: 0.5,
    discountLimit: 5,
    oilPrice: 40,
    methods: [
      { key: 'cash', isEnabled: true, needsProof: false },
      { key: 'cheque', isEnabled: false, needsProof: true },
      { key: 'transfer', isEnabled: true, needsProof: true },
      { key: 'oil', isEnabled: true, needsProof: false },
    ],
    boxCount: 16,
    boxCapacityKg: 1000,
    tanks: tanks('bk', [15000, 10000, 10000, 8000]),
    pressLines: lines('bk', ['']),
    nextTankNumber: 5,
    nextPressLineNumber: 2,
    notificationChannels: structuredClone([...NOTIFICATION_CHANNELS_MOCK]),
    history: [
      change('bk-rate-1', 'millingRate', 0.5, 12),
      change('bk-oil-1', 'oilPrice', 40, 12),
      change('bk-limit-1', 'discountLimit', 5, 40),
    ],
  },
};

export const DEFAULT_CONFIGURATION: Omit<IConfiguration, 'siteId'> = {
  seasonId: SEASON_CURRENT_ID,
  seasonLabel: 'Saison 2026-2027',
  seasonStatus: 'open',
  priceChanges: [],
  millingRate: 0.5,
  discountLimit: 0,
  oilPrice: 40,
  methods: [
    { key: 'cash', isEnabled: true, needsProof: false },
    { key: 'cheque', isEnabled: true, needsProof: false },
    { key: 'transfer', isEnabled: true, needsProof: false },
    { key: 'oil', isEnabled: true, needsProof: false },
  ],
  boxCount: 24,
  boxCapacityKg: 1000,
  tanks: [],
  pressLines: [],
  nextTankNumber: 1,
  nextPressLineNumber: 1,
  history: [],
  notificationChannels: structuredClone([...NOTIFICATION_CHANNELS_MOCK]),
};
