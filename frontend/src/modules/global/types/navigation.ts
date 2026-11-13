import type { Component } from 'vue';

import type { Permission, Role } from 'global/types/session';

export interface INavItem {
  name: string;
  labelKey: string;
  shortLabelKey?: string;
  icon: Component;
  permission?: Permission | readonly Permission[];
  managementPermission?: Permission;
  /** Shown only to these Roles, whatever Permissions others hold. */
  roles?: readonly Role[];
}
