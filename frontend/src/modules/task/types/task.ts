import type { RouteLocationRaw } from 'vue-router';

export type TaskKind = 'discount' | 'payment' | 'payout' | 'refund-make' | 'refund-confirm' | 'client-at-risk' | 'invitation';

/** Decisions first, then money to give back, then people to follow up. */
export type TaskGroup = 'decide' | 'money' | 'follow';

/** One thing waiting on Management, read from the records it comes from: it disappears once that record is settled. */
export interface ITask {
  id: string;
  kind: TaskKind;
  group: TaskGroup;
  subject: string;
  params: Record<string, string | number>;
  amount: number | null;
  at: string | null;
  to: RouteLocationRaw;
}
