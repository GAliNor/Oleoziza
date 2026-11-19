import type { ConfigurationValueKey, INotificationChannelSetting } from 'configuration/types/configuration';

export const CONFIGURATION_VALUES: readonly { key: ConfigurationValueKey; unitKey: string; min: number; max: number; step: number }[] = [
  { key: 'millingRate', unitKey: 'perKg', min: 0.01, max: 100, step: 0.01 },
  { key: 'discountLimit', unitKey: 'percent', min: 0, max: 100, step: 1 },
  { key: 'oilPrice', unitKey: 'perLitre', min: 0.01, max: 1000, step: 0.01 },
];

export const NOTIFICATION_CHANNELS_STORAGE_KEY = 'oleoziza.notificationChannels.v1';

/** After deploy every channel is off; only email can be switched on (Ali, 2026-11-19). */
export const NOTIFICATION_CHANNELS_MOCK: readonly INotificationChannelSetting[] = [
  { channel: 'whatsapp', isImplemented: false, isEnabled: false },
  { channel: 'sms', isImplemented: false, isEnabled: false },
  { channel: 'email', isImplemented: true, isEnabled: false },
];
