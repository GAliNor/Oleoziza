import { APP_LOCALE } from 'global/constants/locale';

export const formatNumber = (value: number, maximumFractionDigits = 0, minimumFractionDigits = 0): string =>
  value.toLocaleString(APP_LOCALE, { minimumFractionDigits, maximumFractionDigits });

/** A change in percent with its sign: +11,6 %, −3,2 %. */
export const formatDelta = (percent: number): string => `${percent >= 0 ? '+' : '−'}${formatNumber(Math.abs(percent), 1, 1)} %`;
