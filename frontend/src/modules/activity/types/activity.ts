import type { RouteLocationRaw } from 'vue-router';

import type { IPage, IPageQuery } from 'global/types/page';

export type ActivityGroup = 'production' | 'storage' | 'discount' | 'payment' | 'expense' | 'follow' | 'configuration';

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
  | 'expense_recorded'
  | 'expense_updated'
  | 'expense_cancelled'
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

/** Which events of the day to list: Money events only for those who see the finances (the backend reads it from the session). */
export interface IActivityFilter {
  group: ActivityGroup | null;
  person: string | null;
  includeMoney: boolean;
}

/** A day's figures and counts, read apart from the list, which loads a page at a time. */
export interface IActivityDaySummary {
  receptions: number;
  receivedKg: number;
  storedLitres: number;
  discounts: number;
  discountDh: number;
  collectedDh: number;
  total: number;
  groupCounts: Record<ActivityGroup, number>;
  people: string[];
}

export interface IActivityService {
  getDaySummary(siteId: string, day: string, includeMoney: boolean): Promise<IActivityDaySummary>;
  getDayPage(siteId: string, day: string, filter: IActivityFilter, page: IPageQuery): Promise<IPage<IActivity>>;
}

export interface IActivityQuery extends IActivityFilter {
  siteId: string;
  day: string;
}

export interface IActivityStore {
  summary: IActivityDaySummary | null;
  items: IActivity[];
  total: number;
  query: IActivityQuery | null;
  loadedDay: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasError: boolean;
}
