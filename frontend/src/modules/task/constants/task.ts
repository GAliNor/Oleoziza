import type { Component } from 'vue';

import type { Permission } from 'global/types/session';
import type { TaskGroup, TaskKind } from 'task/types/task';

import CoinsLineIcon from 'global/icons/coins-line.icon.vue';
import GroupLineIcon from 'global/icons/group-line.icon.vue';
import PercentLineIcon from 'global/icons/percent-line.icon.vue';
import RefreshLineIcon from 'global/icons/refresh-line.icon.vue';
import UserAddLineIcon from 'global/icons/user-add-line.icon.vue';

export const TASK_ROUTE_NAME = 'task';

export const TASK_GROUPS: TaskGroup[] = ['decide', 'money', 'follow'];

/** Holding any of these gives a person something on the To-do page. */
export const TASK_PERMISSIONS: readonly Permission[] = ['discount.approve', 'payment.confirm', 'refund.manage', 'user.manage'];

export const TASK_ICONS: Record<TaskKind, Component> = {
  discount: PercentLineIcon,
  payment: CoinsLineIcon,
  payout: CoinsLineIcon,
  'refund-make': RefreshLineIcon,
  'refund-confirm': RefreshLineIcon,
  'client-at-risk': GroupLineIcon,
  invitation: UserAddLineIcon,
};

export const TASK_GROUP_TONES: Record<TaskGroup, string> = {
  decide: 'bg-accent-subtle text-fg-accent',
  money: 'bg-selected text-fg-brand',
  follow: 'bg-subtle text-fg-primary-paragraph',
};
