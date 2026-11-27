import { i18n } from '~/plugins/i18n';

import { labelColumn } from 'assistant/composables/answer-format';
import { formatFullDate, shiftDate } from 'global/composables/date';
import type { IAnswerMethod, IAnswerMethodCalc, IAnswerMethodFilter, IAnswerMethodQuery } from 'assistant/types/assistant';

export interface IMethodStep {
  title: string;
  details: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const REFERENCE = /^\{([qc])(\d)\.(\w+)\}$/;

const t = (key: string, values: Record<string, unknown> = {}): string => i18n.global.t(key, values);

/** A filter or calc operand in words: dates as dates, enum values translated, earlier results named by their step. */
const describeValue = (value: string): string => {
  const reference = REFERENCE.exec(value.trim());
  if (reference) {
    const [, source, index, column] = reference;
    if (source === 'c') return t('assistant.method.calcResult', { step: index });
    return column === 'id' ? t('assistant.method.recordFound', { step: index }) : t('assistant.method.valueFound', { label: labelColumn(column).toLocaleLowerCase(), step: index });
  }
  if (value === 'today') return t('assistant.method.today');
  if (ISO_DATE.test(value)) return formatFullDate(`${value}T12:00:00Z`);
  const enumKey = `assistant.values.${value}`;
  return i18n.global.te(enumKey) ? t(enumKey) : value;
};

const describeFilter = (filter: IAnswerMethodFilter): string => {
  const values = filter.op === 'in' ? filter.value.split(',').map((item) => describeValue(item.trim())).join(', ') : describeValue(filter.value);
  return t(`assistant.method.operators.${filter.op}`, { field: labelColumn(filter.field), value: values });
};

/** A `gte` and `lt` pair of dates on one field reads as « du … au … », the end being the day before the exclusive bound. */
const describeFilters = (filters: IAnswerMethodFilter[]): string[] => {
  const used = new Set<IAnswerMethodFilter>();
  const lines: string[] = [];
  for (const start of filters) {
    if (start.op !== 'gte' || !ISO_DATE.test(start.value)) continue;
    const end = filters.find((item) => item.field === start.field && item.op === 'lt' && ISO_DATE.test(item.value));
    if (!end) continue;
    used.add(start).add(end);
    lines.push(t('assistant.method.range', { field: labelColumn(start.field), from: describeValue(start.value), to: describeValue(shiftDate(end.value, -1)) }));
  }
  return [...lines, ...filters.filter((item) => !used.has(item)).map(describeFilter)];
};

const describeQuery = (query: IAnswerMethodQuery, index: number): IMethodStep => {
  const entityKey = `assistant.entities.${query.entity}`;
  const details = [
    query.measures.length ? t('assistant.method.measures', { list: query.measures.map(labelColumn).join(', ') }) : t('assistant.method.records'),
    ...(query.groupBy.length ? [t('assistant.method.groupBy', { list: query.groupBy.map(labelColumn).join(', ') })] : []),
    ...describeFilters(query.filters),
    ...(query.period ? [t('assistant.method.period', { period: t(`assistant.method.periods.${query.period}`) })] : []),
    ...(query.compare ? [t(`assistant.method.compare.${query.compare}`)] : []),
  ];
  return { title: t('assistant.method.read', { step: index + 1, what: i18n.global.te(entityKey) ? t(entityKey) : query.entity }), details };
};

const describeCalc = (calc: IAnswerMethodCalc, index: number): IMethodStep => ({
  title: t('assistant.method.calc', { step: index + 1 }),
  details: [t(`assistant.method.calcs.${calc.op}`, { left: describeValue(calc.left), right: describeValue(calc.right) })],
});

/** The steps behind an answer, numbered as the references in its filters and calcs name them. */
export const describeMethod = (method: IAnswerMethod): IMethodStep[] => [...method.queries.map(describeQuery), ...method.calcs.map(describeCalc)];

/** The one date range every dated query of an answer covers, as « du … au … », or null when they differ or none is dated. */
export const describeAnswerRange = (method: IAnswerMethod): string | null => {
  const ranges = method.queries
    .map((query) => {
      const start = query.filters.find((item) => item.op === 'gte' && ISO_DATE.test(item.value));
      const end = start && query.filters.find((item) => item.field === start.field && item.op === 'lt' && ISO_DATE.test(item.value));
      return start && end ? `${start.value}|${end.value}` : null;
    })
    .filter((range): range is string => range !== null);
  if (!ranges.length || new Set(ranges).size > 1) return null;
  const [from, to] = ranges[0].split('|');
  return t('assistant.method.rangeShort', { from: describeValue(from), to: describeValue(shiftDate(to, -1)) });
};
