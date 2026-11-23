import type { RouteLocationRaw } from 'vue-router';

export type TaskKind = 'discount' | 'payment' | 'payout' | 'expense-due' | 'refund-make' | 'refund-confirm' | 'client-at-risk' | 'invitation';

/** Decisions first, then money to give back, then people to follow up. */
export type TaskGroup = 'decide' | 'money' | 'follow';

/** One thing waiting on Management, read from the records it comes from: it disappears once that record is settled. */
export interface ITaskService {
  getTasks(siteId: string): Promise<ITask[]>;
}

export interface ITaskStore {
  tasks: ITask[];
  isLoading: boolean;
  hasError: boolean;
}

export interface ITask {
  id: string;
  kind: TaskKind;
  group: TaskGroup;
  subject: string;
  params: Record<string, string | number>;
  amount: number | null;
  at: string | null;
  to: RouteLocationRaw;
  /** A shortcut beside the task, for its most common action (« Encaisser »). */
  action?: { labelKey: string; to: RouteLocationRaw };
}
