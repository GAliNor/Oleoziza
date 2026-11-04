export type Role = 'management' | 'operator' | 'client';

export type Permission =
  | 'reception.create'
  | 'weighing.create'
  | 'lot.update_status'
  | 'pressing.create'
  | 'withdrawal.create'
  | 'client.create'
  | 'client.edit'
  | 'client.manage_access'
  | 'payment.record'
  | 'payout.record'
  | 'payment.confirm'
  | 'payment.cancel'
  | 'record.correct'
  | 'expense.record'
  | 'purchase.create'
  | 'sale.create'
  | 'daily_price.set'
  | 'product.manage'
  | 'finance.view'
  | 'stock.view'
  | 'user.manage'
  | 'site.manage'
  | 'season.manage'
  | 'audit_trail.view'
  | 'dashboard.view'
  | 'payment_method.manage';

export interface ISession {
  userId: string;
  sid: string;
  role: Role;
  isOwner: boolean;
  sites: Record<string, Permission[]>;
  title?: string;
  firstName: string;
  lastName: string;
  expiresAt: number;
}

export interface ISessionStore {
  session: ISession | null;
  isReady: boolean;
  hasExpired: boolean;
}
