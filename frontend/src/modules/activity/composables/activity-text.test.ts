import { afterEach, describe, expect, it } from 'vitest';

import { i18n } from '~/plugins/i18n';

import { ACTIVITY_GROUPS } from 'activity/composables/activity-feed';
import { activitySubject, activityTitle } from 'activity/composables/activity-text';
import { configurationParams } from 'activity/composables/configuration-story';
import { ACTIVITY_KINDS } from 'activity/constants/activity-kinds';
import type { ActivityKind, IActivity } from 'activity/types/activity';

const event = (kind: ActivityKind, params: IActivity['params'] = {}): IActivity => ({
  id: '1',
  kind,
  group: ACTIVITY_GROUPS[0],
  at: '2026-11-23T10:00:00Z',
  by: 'Mohammed',
  subject: 'Ali Benali',
  params: { code: 'OJ-2627-0001', variety: 'Haouzia', percent: 10, method: 'cash', tankNumber: 2, lineNumber: 1, lineName: '', plannedStartAt: '2026-11-23T10:00:00Z', contact: 'call', category: 'electricity', key: 'millingRate', change: 'value', from: 0.5, to: 0.7, reason: 'Olives abîmées', ...params },
  amount: null,
  litres: null,
  kg: null,
  isMoney: false,
  to: null,
});

const configuration = (params: IActivity['params']): string => activityTitle({ ...event('configuration'), params });
const plain = (text: string): string => text.replace(/[\u00a0\u202f]/g, ' ');

describe('the Journal in words', () => {
  afterEach(() => {
    i18n.global.locale.value = 'fr';
  });

  it.each(['fr', 'ar'] as const)('never shows a translation key, a slug or an unfilled value, for any kind (%s)', (language) => {
    i18n.global.locale.value = language;
    ACTIVITY_KINDS.forEach((kind) => {
      const text = `${activityTitle(event(kind))} ${activitySubject(event(kind))}`;
      expect(text, kind).not.toMatch(/activity\.|expense\.|finance\.|_|\{|\}|undefined|NaN|millingRate/);
      if (language === 'ar') expect(text, kind).toMatch(/[\u0600-\u06ff]/);
    });
  });

  it('names the setting changed, with its old and new values', () => {
    expect(plain(configuration({ key: 'millingRate', change: 'value', from: 0.5, to: 0.7 }))).toBe('Tarif de trituration : 0,50 DH/kg → 0,70 DH/kg');
    expect(plain(configuration({ key: 'oilPrice', change: 'value', to: 50 }))).toBe('Prix de l’huile : 50 DH/L');
    expect(configuration({ key: 'cheque', change: 'method', proof: 'on' })).toBe('Chèque : justificatif obligatoire');
    expect(configuration({ key: 'cash', change: 'method', enabled: 'off', proof: 'off' })).toBe('Espèces : plus accepté, justificatif facultatif');
    expect(plain(configuration({ key: 'boxes', change: 'boxes', countFrom: 0, countTo: 24, capacityFrom: 0, capacityTo: 900 }))).toBe('Box : 0 → 24, 900 kg chacun');
    expect(configuration({ key: 'pressLines', change: 'pressLines', added: '3, 4', removed: '2' })).toBe('Malaxeurs : ajout des n° 3, 4, retrait du n° 2');
    expect(plain(configuration({ key: 'millingRate', change: 'deleted', from: 70, to: 0.5 }))).toBe('Tarif de trituration : 70,00 DH/kg supprimé, retour à 0,50 DH/kg');
  });

  it('says a setting was changed, without its technical name, when this version does not know it', () => {
    expect(configuration({ key: 'daily_price_per_kg', change: 'value', to: 4 })).toBe('Réglage modifié');
  });

  it('gives the reason of a corrected rate', () => {
    expect(activitySubject(event('rate_corrected'))).toBe('Ali Benali · motif : Olives abîmées');
  });

  it('tells a mock change with the params the backend sends', () => {
    const line = (number: number) => ({ id: `l${number}`, number, name: '' });
    const change = { id: 'c', key: 'pressLines' as const, value: null, method: null, equipment: { pressLines: [line(1), line(3)] }, before: { value: null, method: null, equipment: { pressLines: [line(1), line(2)] } }, by: 'M', at: '' };
    expect(configurationParams(change)).toEqual({ key: 'pressLines', change: 'pressLines', added: '3', removed: '2' });
  });
});
