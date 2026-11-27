import { formatNumber } from 'global/composables/number';
import { intlLocale } from 'global/composables/language';

export const formatUsd = (amount: number, decimals = 2): string => `${formatNumber(amount, decimals, decimals)} $`;

/** « novembre 2026 » from « 2026-11 ». */
export const formatMonth = (month: string): string => new Date(`${month}-15T12:00:00Z`).toLocaleString(intlLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' });
