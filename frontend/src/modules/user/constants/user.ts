import type { LoginMethod } from 'auth/types/auth';
import type { IPermissionGroup, StaffRole, UserFilter, UserView } from 'user/types/user';

export const PAGE_SIZE = 10;

export const NEW_USER = 'new';

export const USER_FILTERS: UserFilter[] = ['all', 'management', 'operator', 'invited', 'disabled'];

export const USER_VIEWS: UserView[] = ['list', 'teams'];

export const STAFF_ROLES: StaffRole[] = ['operator', 'management'];

export const LOGIN_METHODS: LoginMethod[] = ['phone_pin', 'email_password', 'phone_otp'];

export const PERMISSION_GROUPS: IPermissionGroup[] = [
  { key: 'follow', permissions: ['dashboard.view', 'stock.view', 'audit_trail.view'] },
  { key: 'production', permissions: ['reception.create', 'weighing.create', 'lot.update_status', 'pressing.create', 'withdrawal.create', 'purchase.create'] },
  { key: 'clients', permissions: ['client.create', 'client.edit', 'client.manage_access'] },
  { key: 'counter', permissions: ['payment.record', 'payout.record', 'sale.create'] },
  { key: 'finance', permissions: ['finance.view', 'payment.confirm', 'payment.cancel', 'payment_method.manage', 'expense.record'] },
  { key: 'admin', permissions: ['record.correct', 'daily_price.set', 'product.manage', 'user.manage', 'site.manage', 'season.manage'] },
];
