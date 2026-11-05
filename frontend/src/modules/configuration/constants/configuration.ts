import type { ConfigurationValueKey } from 'configuration/types/configuration';

export const CONFIGURATION_VALUES: readonly { key: ConfigurationValueKey; unitKey: string; min: number; max: number; step: number }[] = [
  { key: 'millingRate', unitKey: 'perKg', min: 0.01, max: 100, step: 0.01 },
  { key: 'discountLimit', unitKey: 'percent', min: 0, max: 100, step: 1 },
  { key: 'oilPrice', unitKey: 'perLitre', min: 0.01, max: 1000, step: 0.01 },
];
