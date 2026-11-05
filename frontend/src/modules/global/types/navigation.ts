import type { Component } from 'vue';

import type { Permission } from 'global/types/session';

export interface INavItem {
  name: string;
  labelKey: string;
  shortLabelKey?: string;
  icon: Component;
  permission?: Permission | readonly Permission[];
  managementPermission?: Permission;
}
