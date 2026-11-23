import { i18n } from '~/plugins/i18n';

import { formatSettingValue } from 'configuration/composables/setting-value';
import { formatFullDate } from 'global/composables/date';
import { formatKg } from 'lot/composables/quantity';
import type { ConfigurationValueKey, IConfigurationChange } from 'configuration/types/configuration';
import type { IActivity } from 'activity/types/activity';

type Params = IActivity['params'];

const t = (key: string, values: Record<string, unknown> = {}, plural?: number): string => (plural === undefined ? i18n.global.t(`activity.story.${key}`, values) : i18n.global.t(`activity.story.${key}`, values, plural));

const settingName = (key: string): string => (i18n.global.te(`activity.settings.${key}`, 'fr') ? i18n.global.t(`activity.settings.${key}`) : '');

const isValueKey = (key: string): key is ConfigurationValueKey => ['millingRate', 'discountLimit', 'oilPrice'].includes(key);

const describePrice = (params: Params, key: ConfigurationValueKey): string => {
  const setting = settingName(key);
  const price = (name: 'from' | 'to'): string => formatSettingValue(key, Number(params[name]));
  if (params.change === 'cancelled') return t('cancelled', { setting, from: price('from') });
  if (params.change === 'deleted') return params.to === undefined ? t('deleted', { setting, from: price('from') }) : t('deletedBack', { setting, from: price('from'), to: price('to') });
  const text = params.from === undefined ? t('valueSet', { setting, to: price('to') }) : t('value', { setting, from: price('from'), to: price('to') });
  return params.effectiveFrom ? t('valueLater', { text, date: formatFullDate(String(params.effectiveFrom)) }) : text;
};

const describeMethod = (params: Params, key: string): string => {
  const states = [params.enabled && t(params.enabled === 'on' ? 'enabledOn' : 'enabledOff'), params.proof && t(params.proof === 'on' ? 'proofOn' : 'proofOff')].filter(Boolean);
  return t('method', { setting: settingName(key), states: states.join(', ') || t('unchanged') });
};

const describeBoxes = (params: Params): string => {
  const capacity = formatKg(Number(params.capacityTo ?? 0));
  if (params.countFrom === undefined) return t('boxesSet', { to: params.countTo, capacity });
  if (params.countFrom === params.countTo) return t('boxCapacity', { capacityFrom: formatKg(Number(params.capacityFrom ?? 0)), capacityTo: capacity });
  return t('boxes', { from: params.countFrom, to: params.countTo, capacity });
};

const describeEquipment = (params: Params, key: string): string => {
  const setting = settingName(key);
  if (params.countTo !== undefined) return t('valueSet', { setting, to: params.countTo });
  const changes = (['added', 'removed', 'changed'] as const).flatMap((name) => {
    const numbers = params[name];
    return numbers ? [t(name, { numbers }, String(numbers).split(',').length)] : [];
  });
  return t('equipment', { setting, changes: changes.join(', ') || t('unchanged') });
};

/** A Configuration change in words: which setting, and what it was and became. A setting this version doesn't know is told without its technical name. */
export const describeConfiguration = (params: Params): string => {
  const key = String(params.key ?? '');
  if (isValueKey(key)) return describePrice(params, key);
  if (!settingName(key)) return t('unknown');
  if (key === 'boxes') return describeBoxes(params);
  return key === 'tanks' || key === 'pressLines' ? describeEquipment(params, key) : describeMethod(params, key);
};

const numbersOf = (items: readonly { number: number }[]): string => items.map((item) => item.number).join(', ');

/** The same params the backend sends, from a mock history entry. */
export const configurationParams = (change: IConfigurationChange): Params => {
  const { key, before, equipment, method, value } = change;
  if (method) {
    const state = (isOn: boolean): string => (isOn ? 'on' : 'off');
    return {
      key,
      change: 'method',
      ...(before?.method?.isEnabled === method.isEnabled ? {} : { enabled: state(method.isEnabled) }),
      ...(before?.method?.needsProof === method.needsProof ? {} : { proof: state(method.needsProof) }),
    };
  }
  if (equipment && key === 'boxes') {
    const old = before?.equipment;
    return { key, change: key, countTo: equipment.boxCount ?? 0, capacityTo: equipment.boxCapacityKg ?? 0, ...(old ? { countFrom: old.boxCount ?? 0, capacityFrom: old.boxCapacityKg ?? 0 } : {}) };
  }
  if (equipment && (key === 'tanks' || key === 'pressLines')) {
    const items = equipment[key] ?? [];
    const old = before?.equipment?.[key];
    if (!old) return { key, change: key, countTo: items.length };
    const added = items.filter((item) => !old.some((other) => other.id === item.id));
    const removed = old.filter((item) => !items.some((other) => other.id === item.id));
    const changed = items.filter((item) => old.some((other) => other.id === item.id && JSON.stringify(other) !== JSON.stringify(item)));
    return { key, change: key, ...(added.length ? { added: numbersOf(added) } : {}), ...(removed.length ? { removed: numbersOf(removed) } : {}), ...(changed.length ? { changed: numbersOf(changed) } : {}) };
  }
  return { key, change: 'value', to: value ?? 0, ...(before?.value === undefined || before.value === null ? {} : { from: before.value }) };
};
