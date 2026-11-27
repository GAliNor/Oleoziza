import type { Component } from 'vue';

import type { Permission, Role } from 'global/types/session';

/** How often the item is opened: daily work, occasional checks, once per Season. The menu separates the groups. */
export type NavGroup = 'daily' | 'occasional' | 'seasonal';

export interface INavItem {
  name: string;
  labelKey: string;
  shortLabelKey?: string;
  icon: Component;
  group: NavGroup;
  permission?: Permission | readonly Permission[];
  managementPermission?: Permission;
  /** Shown only to these Roles, whatever Permissions others hold. */
  roles?: readonly Role[];
}
