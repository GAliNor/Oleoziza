import { i18n } from '~/plugins/i18n';

import { formatNumber } from 'global/composables/number';

const MINUS = '−';

const withUnit = (amount: number, digits: string): string => `${amount < 0 ? MINUS : ''}${digits} ${i18n.global.t('global.units.dirham')}`;

/** The exact amount: centimes only when there are some. For registers, details, prices and receipts. */
export const formatMoney = (amount: number): string => {
  const centimes = Math.round(Math.abs(amount) * 100);
  const hasCentimes = centimes % 100 !== 0;
  return withUnit(amount, formatNumber(centimes / 100, 2, hasCentimes ? 2 : 0));
};

/** Whole dirhams, for tiles and charts only. */
export const formatMoneyRounded = (amount: number): string => {
  const dirhams = Math.round(Math.abs(amount));
  return withUnit(dirhams === 0 ? 0 : amount, formatNumber(dirhams));
};
