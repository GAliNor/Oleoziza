import type { INavItem } from 'global/types/navigation';

import CoinsLineIcon from 'global/icons/coins-line.icon.vue';
import GroupLineIcon from 'global/icons/group-line.icon.vue';
import HomeLineIcon from 'global/icons/home-line.icon.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';
import ScaleLineIcon from 'global/icons/scale-line.icon.vue';
import UserSettingsLineIcon from 'global/icons/user-settings-line.icon.vue';

export const HOME_ROUTE_NAME = 'dashboard';

export const NAV_ITEMS: INavItem[] = [
  { name: HOME_ROUTE_NAME, labelKey: 'global.nav.dashboard', icon: HomeLineIcon, managementPermission: 'dashboard.view' },
  { name: 'lot', labelKey: 'global.nav.operations', icon: ScaleLineIcon, permission: 'audit_trail.view', roles: ['management'] },
  { name: 'finance', labelKey: 'global.nav.finances', icon: CoinsLineIcon, permission: 'finance.view', roles: ['management'] },
  { name: 'client-search', labelKey: 'global.nav.clients', icon: GroupLineIcon, roles: ['management'] },
  { name: 'user', labelKey: 'global.nav.users', icon: UserSettingsLineIcon, permission: 'user.manage' },
  { name: 'site', labelKey: 'global.nav.sites', icon: MapPinLineIcon, permission: 'site.manage' },
];
