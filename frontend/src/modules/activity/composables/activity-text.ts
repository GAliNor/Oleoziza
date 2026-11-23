import { i18n } from '~/plugins/i18n';

import { describeConfiguration } from 'activity/composables/configuration-story';
import { formatPressLine, formatTank } from 'configuration/composables/equipment';
import { formatSettingValue } from 'configuration/composables/setting-value';
import { formatDateTime, formatFullDate } from 'global/composables/date';
import type { IActivity } from 'activity/types/activity';

const t = (key: string, values: Record<string, unknown> = {}): string => i18n.global.t(key, values);

const lineOf = ({ lineNumber, lineName }: IActivity['params']): string => (lineNumber ? formatPressLine({ number: Number(lineNumber), name: String(lineName ?? '') }) : t('activity.aPressLine'));

/** What happened, in the reader's words: every slug, key and number of the event becomes a label. */
export const activityTitle = ({ kind, params }: IActivity): string =>
  t(`activity.kinds.${kind}`, {
    ...params,
    method: params.method ? t(`finance.methods.${params.method}`) : '',
    tank: params.tankNumber ? formatTank({ number: Number(params.tankNumber) }) : t('activity.aTank'),
    line: lineOf(params),
    start: params.plannedStartAt ? formatDateTime(String(params.plannedStartAt)) : '',
    contact: params.contact ? t(`finance.debts.kinds.${params.contact}`) : '',
    category: params.category ? t(`expense.categories.${params.category}`) : '',
    ...(kind === 'rate_corrected' ? { from: formatSettingValue('millingRate', Number(params.from ?? 0)), to: formatSettingValue('millingRate', Number(params.to ?? 0)) } : {}),
    ...(kind === 'configuration' ? { story: describeConfiguration(params) } : {}),
  });

/** Whom or what it concerns: the Client, the Site's settings, with the promised date or the reason when there is one. */
export const activitySubject = ({ kind, params, subject }: IActivity): string => {
  if (kind === 'configuration') return t('activity.settingsSubject');
  if (kind === 'debt_contact' && params.promisedOn) return `${subject} · ${t('activity.promised', { date: formatFullDate(String(params.promisedOn)) })}`;
  if (kind === 'rate_corrected' && params.reason) return `${subject} · ${t('activity.reason', { reason: params.reason })}`;
  return subject;
};
