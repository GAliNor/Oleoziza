import { APP_LOCALE } from 'global/constants/locale';

export const formatNumber = (value: number, maximumFractionDigits = 0, minimumFractionDigits = 0): string =>
  value.toLocaleString(APP_LOCALE, { minimumFractionDigits, maximumFractionDigits });
