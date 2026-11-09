import type { INavItem } from 'global/types/navigation';
import type { Permission } from 'global/types/session';

import CoinsLineIcon from 'global/icons/coins-line.icon.vue';
import GroupLineIcon from 'global/icons/group-line.icon.vue';
import HistoryLineIcon from 'global/icons/history-line.icon.vue';
import HomeLineIcon from 'global/icons/home-line.icon.vue';
import InboxLineIcon from 'global/icons/inbox-line.icon.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';
import PercentLineIcon from 'global/icons/percent-line.icon.vue';
import PhoneLineIcon from 'global/icons/phone-line.icon.vue';
import ScaleLineIcon from 'global/icons/scale-line.icon.vue';
import SlidersLineIcon from 'global/icons/sliders-line.icon.vue';
import UserSettingsLineIcon from 'global/icons/user-settings-line.icon.vue';
import WalletLineIcon from 'global/icons/wallet-line.icon.vue';

export const HOME_ROUTE_NAME = 'dashboard';

/** Holding any of these on the current Site opens the Backoffice to an Operator. Clients alone do not: every Operator reads them. */
export const BACKOFFICE_PERMISSIONS: readonly Permission[] = ['dashboard.view', 'record.correct', 'audit_trail.view', 'finance.view', 'debt.follow', 'user.manage', 'site.manage', 'configuration.manage', 'discount.approve'];

/** The cash desk comes first, so the Accountant, who has no Home, lands on it. */
export const NAV_ITEMS: INavItem[] = [
  { name: 'cash-desk', labelKey: 'global.nav.cashDesk', icon: WalletLineIcon, permission: 'payment.record' },
  { name: 'debt-follow-up', labelKey: 'global.nav.debts', icon: PhoneLineIcon, permission: 'debt.follow' },
  { name: 'task', labelKey: 'global.nav.tasks', icon: InboxLineIcon, permission: ['discount.approve', 'payment.confirm', 'refund.manage', 'user.manage'] },
  { name: 'activity', labelKey: 'global.nav.activity', icon: HistoryLineIcon, permission: 'audit_trail.view' },
  { name: HOME_ROUTE_NAME, labelKey: 'global.nav.dashboard', shortLabelKey: 'global.nav.dashboardShort', icon: HomeLineIcon, managementPermission: 'dashboard.view' },
  { name: 'lot', labelKey: 'global.nav.operations', icon: ScaleLineIcon, permission: ['record.correct', 'audit_trail.view'] },
  { name: 'finance', labelKey: 'global.nav.finances', icon: CoinsLineIcon, permission: 'finance.view' },
  { name: 'discount-queue', labelKey: 'global.nav.discounts', icon: PercentLineIcon, permission: 'discount.approve' },
  { name: 'client-search', labelKey: 'global.nav.clients', icon: GroupLineIcon, permission: 'client.view' },
  { name: 'user', labelKey: 'global.nav.users', icon: UserSettingsLineIcon, permission: 'user.manage' },
  { name: 'site', labelKey: 'global.nav.sites', icon: MapPinLineIcon, permission: 'site.manage' },
  { name: 'configuration', labelKey: 'global.nav.configuration', shortLabelKey: 'global.nav.configurationShort', icon: SlidersLineIcon, permission: 'configuration.manage' },
];
