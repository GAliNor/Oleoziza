import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { ISiteReceptionSettings } from 'reception/types/reception';

export const LAST_LOT_NUMBER_MOCK: Record<string, { prefix: string; number: number }> = {
  [SITE_OUJDA_ID]: { prefix: 'OJ-2627', number: 158 },
  [SITE_BERKANE_ID]: { prefix: 'BK-2627', number: 87 },
};

export const SETTINGS_MOCK: Record<string, Omit<ISiteReceptionSettings, 'millingRatePerKg' | 'discountLimitPercent'>> = {
  [SITE_OUJDA_ID]: { dailyPricePerKg: 7.2, boxCount: 24, boxCapacityKg: 1000 },
  [SITE_BERKANE_ID]: { dailyPricePerKg: null, boxCount: 16, boxCapacityKg: 1000 },
};
