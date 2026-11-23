import ExpenseService from 'expense/services/expense';
import { useSiteStore } from 'site/stores/site';
import { byOldest, deriveExpenseTasks, deriveTasks, loadTaskSources } from 'task/composables/derive-tasks';
import type { ITask, ITaskService } from 'task/types/task';

const DUE_LIMIT = 100;

/** The tasks the mock modules hold, derived in the front with the rules the backend applies. */
export default class TaskMockService implements ITaskService {
  async getTasks(siteId: string): Promise<ITask[]> {
    await loadTaskSources(siteId);
    const due = useSiteStore().can('expense.record') ? await new ExpenseService().getPage({ siteId, period: 'season', categoryId: null, search: '', paymentState: 'to_pay' }, { offset: 0, limit: DUE_LIMIT }) : { items: [] };
    return [...deriveTasks(), ...deriveExpenseTasks(due.items)].sort(byOldest);
  }
}
