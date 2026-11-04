import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { ISiteReceptionSettings } from 'reception/types/reception';

export const LAST_LOT_NUMBER_MOCK: Record<string, { prefix: string; number: number }> = {
  [SITE_OUJDA_ID]: { prefix: 'OJ-2627', number: 158 },
  [SITE_BERKANE_ID]: { prefix: 'BK-2627', number: 87 },
};

export const SETTINGS_MOCK: Record<string, ISiteReceptionSettings> = {
  [SITE_OUJDA_ID]: { containerTareKg: { sac: 0.6, caisse: 2 }, dailyPricePerKg: 7.2 },
  [SITE_BERKANE_ID]: { containerTareKg: { sac: 0.6, caisse: 2 }, dailyPricePerKg: null },
};
