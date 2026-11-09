import type { RouteLocationRaw } from 'vue-router';

export type ActivityGroup = 'production' | 'storage' | 'discount' | 'payment' | 'follow' | 'configuration';

export type ActivityKind =
  | 'reception'
  | 'pressing'
  | 'pressed'
  | 'withdrawal'
  | 'stored'
  | 'discount_given'
  | 'discount_pending'
  | 'discount_approved'
  | 'discount_refused'
  | 'payment_recorded'
  | 'payment_confirmed'
  | 'payment_rejected'
  | 'payment_cancelled'
  | 'refund_made'
  | 'refund_confirmed'
  | 'debt_contact'
  | 'configuration';

/** One thing someone did on a Site, read from the Audit Trail and told as a business event. */
export interface IActivity {
  id: string;
  kind: ActivityKind;
  group: ActivityGroup;
  at: string;
  by: string;
  subject: string;
  params: Record<string, string | number>;
  amount: number | null;
  litres: number | null;
  kg: number | null;
  isMoney: boolean;
  to: RouteLocationRaw | null;
}

export interface IActivityService {
  getDay(siteId: string, day: string): Promise<IActivity[]>;
}

export interface IActivityStore {
  items: IActivity[];
  query: { siteId: string; day: string } | null;
  isLoading: boolean;
  hasError: boolean;
}
