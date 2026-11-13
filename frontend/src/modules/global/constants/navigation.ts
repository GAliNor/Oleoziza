import type { INavItem } from 'global/types/navigation';

import CoinsLineIcon from 'global/icons/coins-line.icon.vue';
import GroupLineIcon from 'global/icons/group-line.icon.vue';
import HistoryLineIcon from 'global/icons/history-line.icon.vue';
import HomeLineIcon from 'global/icons/home-line.icon.vue';
import InboxLineIcon from 'global/icons/inbox-line.icon.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';
import PhoneLineIcon from 'global/icons/phone-line.icon.vue';
import ScaleLineIcon from 'global/icons/scale-line.icon.vue';
import SlidersLineIcon from 'global/icons/sliders-line.icon.vue';
import UserSettingsLineIcon from 'global/icons/user-settings-line.icon.vue';
import WalletLineIcon from 'global/icons/wallet-line.icon.vue';

export const HOME_ROUTE_NAME = 'dashboard';

export const OPERATOR_MODE_STORAGE_KEY = 'oleoziza.operator-mode.v1';

/** Management's order: Dashboard, Journal, To-do, then the rest. The Accountant has no Home, so it lands on the cash desk, the first item it can open. */
export const NAV_ITEMS: INavItem[] = [
  { name: HOME_ROUTE_NAME, labelKey: 'global.nav.dashboard', shortLabelKey: 'global.nav.dashboardShort', icon: HomeLineIcon, managementPermission: 'dashboard.view' },
  { name: 'cash-desk', labelKey: 'global.nav.cashDesk', icon: WalletLineIcon, permission: 'payment.record', roles: ['accountant'] },
  { name: 'debt-follow-up', labelKey: 'global.nav.debts', icon: PhoneLineIcon, permission: 'debt.follow', roles: ['accountant'] },
  { name: 'activity', labelKey: 'global.nav.activity', shortLabelKey: 'global.nav.activityShort', icon: HistoryLineIcon, permission: 'audit_trail.view' },
  { name: 'task', labelKey: 'global.nav.tasks', icon: InboxLineIcon, permission: ['discount.approve', 'payment.confirm', 'refund.manage', 'user.manage'] },
  { name: 'lot', labelKey: 'global.nav.operations', icon: ScaleLineIcon, permission: ['record.correct', 'audit_trail.view'] },
  { name: 'finance', labelKey: 'global.nav.finances', icon: CoinsLineIcon, permission: 'finance.view' },
  { name: 'client-search', labelKey: 'global.nav.clients', icon: GroupLineIcon, permission: 'client.view' },
  { name: 'user', labelKey: 'global.nav.users', icon: UserSettingsLineIcon, permission: 'user.manage' },
  { name: 'site', labelKey: 'global.nav.sites', icon: MapPinLineIcon, permission: 'site.manage' },
  { name: 'configuration', labelKey: 'global.nav.configuration', shortLabelKey: 'global.nav.configurationShort', icon: SlidersLineIcon, permission: 'configuration.manage' },
];
