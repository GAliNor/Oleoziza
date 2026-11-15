import type { Component } from 'vue';

import type { ActivityGroup } from 'activity/types/activity';

import CoinsLineIcon from 'global/icons/coins-line.icon.vue';
import DropLineIcon from 'global/icons/drop-line.icon.vue';
import PercentLineIcon from 'global/icons/percent-line.icon.vue';
import PhoneLineIcon from 'global/icons/phone-line.icon.vue';
import ReceiptLineIcon from 'global/icons/receipt-line.icon.vue';
import ScaleLineIcon from 'global/icons/scale-line.icon.vue';
import SlidersLineIcon from 'global/icons/sliders-line.icon.vue';

export const ACTIVITY_GROUP_ICONS: Record<ActivityGroup, Component> = {
  production: ScaleLineIcon,
  storage: DropLineIcon,
  discount: PercentLineIcon,
  payment: CoinsLineIcon,
  expense: ReceiptLineIcon,
  follow: PhoneLineIcon,
  configuration: SlidersLineIcon,
};

export const ACTIVITY_GROUP_TONES: Record<ActivityGroup, string> = {
  production: 'bg-selected text-fg-brand',
  storage: 'bg-accent-subtle text-fg-accent',
  discount: 'bg-warning-subtle text-fg-warning',
  payment: 'bg-success-subtle text-fg-success',
  expense: 'bg-subtle text-fg-accent',
  follow: 'bg-info-subtle text-fg-info',
  configuration: 'bg-subtle text-fg-primary-paragraph',
};

/** Groups that carry money, shown only to those who see the finances. */
export const MONEY_ACTIVITY_GROUPS: readonly ActivityGroup[] = ['discount', 'payment', 'expense', 'follow'];
