import { shiftDate, todayIso } from 'global/composables/date';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { IConfiguration, IConfigurationChange } from 'configuration/types/configuration';

const daysAgo = (days: number): string => `${shiftDate(todayIso(), -days)}T09:00:00+01:00`;

const change = (id: string, key: IConfigurationChange['key'], value: number, days: number, by = 'Mohammed Taibi'): IConfigurationChange => ({ id, key, value, method: null, by, at: daysAgo(days) });

export const CONFIGURATIONS_MOCK: Record<string, IConfiguration> = {
  [SITE_OUJDA_ID]: {
    siteId: SITE_OUJDA_ID,
    millingRate: 0.5,
    discountLimit: 10,
    oilPrice: 40,
    methods: [
      { key: 'cash', isEnabled: true, needsProof: false },
      { key: 'cheque', isEnabled: true, needsProof: true },
      { key: 'transfer', isEnabled: true, needsProof: true },
      { key: 'oil', isEnabled: true, needsProof: false },
    ],
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
    millingRate: 0.5,
    discountLimit: 5,
    oilPrice: 40,
    methods: [
      { key: 'cash', isEnabled: true, needsProof: false },
      { key: 'cheque', isEnabled: false, needsProof: true },
      { key: 'transfer', isEnabled: true, needsProof: true },
      { key: 'oil', isEnabled: true, needsProof: false },
    ],
    history: [
      change('bk-rate-1', 'millingRate', 0.5, 12),
      change('bk-oil-1', 'oilPrice', 40, 12),
      change('bk-limit-1', 'discountLimit', 5, 40),
    ],
  },
};

export const DEFAULT_CONFIGURATION: Omit<IConfiguration, 'siteId'> = {
  millingRate: 0.5,
  discountLimit: 0,
  oilPrice: 40,
  methods: [
    { key: 'cash', isEnabled: true, needsProof: false },
    { key: 'cheque', isEnabled: true, needsProof: false },
    { key: 'transfer', isEnabled: true, needsProof: false },
    { key: 'oil', isEnabled: true, needsProof: false },
  ],
  history: [],
};
