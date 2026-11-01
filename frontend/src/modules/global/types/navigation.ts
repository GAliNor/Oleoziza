import type { Component } from 'vue';

import type { Permission, Role } from 'auth/types/auth';

export interface INavItem {
  name: string;
  labelKey: string;
  shortLabelKey?: string;
  icon: Component;
  permission?: Permission;
  managementPermission?: Permission;
  roles?: Role[];
}
