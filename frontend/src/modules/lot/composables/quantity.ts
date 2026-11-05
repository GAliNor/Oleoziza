import { i18n } from '~/plugins/i18n';

import { formatNumber } from 'global/composables/number';

const withUnit = (digits: string, unit: 'kilogram' | 'quintal' | 'litre' | 'litrePerQuintal'): string => `${digits} ${i18n.global.t(`global.units.${unit}`)}`;

/** Up to 100 g, the precision of a Lot's net weight. */
export const formatKg = (kg: number): string => withUnit(formatNumber(kg, 1), 'kilogram');

/** Whole kilograms, for tiles and charts only. */
export const formatKgRounded = (kg: number): string => withUnit(formatNumber(Math.round(kg)), 'kilogram');

export const formatQuintals = (kg: number): string => withUnit(formatNumber(kg / 100, 1), 'quintal');

/** Up to 0,1 L, the precision of a Pressing or an oil-share Payment. */
export const formatLitres = (litres: number): string => withUnit(formatNumber(litres, 1), 'litre');

/** Whole litres, for tiles and charts only. */
export const formatLitresRounded = (litres: number): string => withUnit(formatNumber(Math.round(litres)), 'litre');

export const formatOliveKg = (kg: number): string => i18n.global.t('lot.quantity.olives', { quantity: formatKg(kg) });

export const formatOil = (litres: number): string => i18n.global.t('lot.quantity.oil', { quantity: formatLitres(litres) });

/** Litres of oil per quintal of olives. */
export const yieldPerQuintal = (oilLitres: number, oliveKg: number): number => (oliveKg ? oilLitres / (oliveKg / 100) : 0);

export const formatYieldValue = (litresPerQuintal: number): string => withUnit(formatNumber(litresPerQuintal, 1, 1), 'litrePerQuintal');

export const formatYield = (oilLitres: number, oliveKg: number): string => formatYieldValue(yieldPerQuintal(oilLitres, oliveKg));
