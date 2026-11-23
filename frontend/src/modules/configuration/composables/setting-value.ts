import { i18n } from '~/plugins/i18n';

import { formatNumber } from 'global/composables/number';
import { CONFIGURATION_VALUES } from 'configuration/constants/configuration';
import type { ConfigurationValueKey } from 'configuration/types/configuration';

/** A Season price with its unit: « 0,50 DH/kg », « 10 % », « 40 DH/L ». */
export const formatSettingValue = (key: ConfigurationValueKey, value: number): string => {
  const setting = CONFIGURATION_VALUES.find((item) => item.key === key);
  return `${formatNumber(value, 2, key === 'millingRate' ? 2 : 0)} ${i18n.global.t(`configuration.units.${setting?.unitKey ?? 'perKg'}`)}`;
};
