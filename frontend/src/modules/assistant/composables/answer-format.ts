import { i18n } from '~/plugins/i18n';

import { formatFullDate } from 'global/composables/date';
import { formatMoney, formatMoneyRounded } from 'global/composables/money';
import { formatNumber } from 'global/composables/number';
import { formatKg, formatLitres } from 'lot/composables/quantity';
import type { ColumnKind } from 'assistant/types/assistant';

const NUMERIC_KINDS: ColumnKind[] = ['number', 'amount', 'litres', 'kilograms', 'days'];

export const isNumericKind = (kind: ColumnKind): boolean => NUMERIC_KINDS.includes(kind);

/** A column's label: the module's own wording when it has one, else the key made readable. */
export const labelColumn = (key: string): string => {
  const base = key.replace(/_(previous|change_pct)$/, '');
  const suffix = key.slice(base.length);
  const translationKey = `assistant.columns.${base}`;
  const label = i18n.global.te(translationKey) ? i18n.global.t(translationKey) : base.replaceAll('_', ' ');
  return suffix ? i18n.global.t(`assistant.columns.suffix${suffix === '_previous' ? 'Previous' : 'Change'}`, { label }) : label;
};

/** A value as the app writes it: DH, litres, kg, days, Moroccan dates; enum values in words. */
export const formatAnswerValue = (value: unknown, kind: ColumnKind, key = '', isRounded = false): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (isNumericKind(kind)) {
    const number = Number(value);
    if (key.endsWith('_change_pct')) return `${number >= 0 ? '+' : '−'}${formatNumber(Math.abs(number), 1, 1)} %`;
    if (kind === 'amount') return isRounded ? formatMoneyRounded(number) : formatMoney(number);
    if (kind === 'litres') return formatLitres(number);
    if (kind === 'kilograms') return formatKg(number);
    if (kind === 'days') return i18n.global.t('assistant.units.days', { count: number }, Math.abs(number));
    return formatNumber(number, 1);
  }
  if (kind === 'date') return formatFullDate(String(value));
  if (kind === 'enum') {
    const translationKey = `assistant.values.${String(value)}`;
    return i18n.global.te(translationKey) ? i18n.global.t(translationKey) : String(value);
  }
  return String(value);
};
