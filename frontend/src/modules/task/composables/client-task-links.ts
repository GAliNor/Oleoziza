import { useSiteStore } from 'site/stores/site';
import type { ITask } from 'task/types/task';

/** « Client à relancer » leads to Recouvrement on that Client, with « Encaisser » beside it, for whoever follows debts; else to the Client page. */
export const withClientTaskLinks = (task: ITask, clientId: string): ITask => {
  if (task.kind !== 'client-at-risk') return task;
  const siteStore = useSiteStore();
  if (!siteStore.can('debt.follow')) return { ...task, to: { name: 'client-page', params: { id: clientId } } };
  const action = siteStore.can('payment.record') ? { labelKey: 'task.actions.collect', to: { name: 'debt-follow-up', query: { client: clientId, pay: '1' } } } : undefined;
  return { ...task, to: { name: 'debt-follow-up', query: { client: clientId } }, action };
};
