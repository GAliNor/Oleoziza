import { i18n } from '~/plugins/i18n';

import { formatNumber } from 'global/composables/number';
import { OIL_DENSITY } from 'lot/constants/lot';

const withUnit = (digits: string, unit: 'kilogram' | 'quintal' | 'litre'): string => `${digits} ${i18n.global.t(`global.units.${unit}`)}`;

/** Up to 100 g, the precision of a Weighing. */
export const formatKg = (kg: number): string => withUnit(formatNumber(kg, 1), 'kilogram');

/** Whole kilograms, for tiles and charts only. */
export const formatKgRounded = (kg: number): string => withUnit(formatNumber(Math.round(kg)), 'kilogram');

export const formatQuintals = (kg: number): string => withUnit(formatNumber(kg / 100, 1), 'quintal');

export const toLitres = (oilKg: number): number => Math.round(oilKg / OIL_DENSITY);

export const formatLitres = (oilKg: number): string => withUnit(formatNumber(toLitres(oilKg)), 'litre');

export const formatOliveKg = (kg: number): string => i18n.global.t('lot.quantity.olives', { quantity: formatKg(kg) });

export const formatOilKg = (kg: number): string => i18n.global.t('lot.quantity.oil', { quantity: formatKg(kg) });

export const formatYield = (oilKg: number, oliveKg: number): string => `${formatNumber((oilKg / oliveKg) * 100, 1, 1)} %`;
