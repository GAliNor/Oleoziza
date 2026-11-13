import type { Permission, Role } from 'global/types/session';

export const PERMISSIONS: readonly Permission[] = [
  'reception.create',
  'lot.update_status',
  'lot.set_price',
  'pressing.create',
  'withdrawal.create',
  'client.view',
  'client.create',
  'client.edit',
  'client.manage_access',
  'payment.record',
  'payout.record',
  'payment.confirm',
  'payment.cancel',
  'document.add',
  'refund.manage',
  'discount.give',
  'discount.approve',
  'debt.follow',
  'record.correct',
  'expense.record',
  'purchase.create',
  'sale.create',
  'daily_price.set',
  'product.manage',
  'finance.view',
  'stock.view',
  'user.manage',
  'site.manage',
  'season.manage',
  'audit_trail.view',
  'dashboard.view',
  'configuration.manage',
];

/** The only Permissions an Operator can hold: everything else opens the Backoffice, which an Operator never enters. */
export const OPERATOR_WORKSPACE_PERMISSIONS: readonly Permission[] = [
  'reception.create',
  'lot.update_status',
  'pressing.create',
  'withdrawal.create',
  'client.view',
  'client.create',
  'client.edit',
  'purchase.create',
];

export const ROLE_DEFAULT_PERMISSIONS: Record<Role, readonly Permission[]> = {
  management: PERMISSIONS,
  operator: OPERATOR_WORKSPACE_PERMISSIONS,
  accountant: ['finance.view', 'client.view', 'payment.record', 'payment.confirm', 'payment.cancel', 'document.add', 'refund.manage', 'discount.give', 'debt.follow'],
  client: [],
};
