import BaseService, { isMockModule } from 'global/services/base';
import TaskMockService from 'task/services/task.mock';
import { ALL_SITES } from 'site/constants/site';
import type { ITask, ITaskService } from 'task/types/task';

type TaskAnswer = Omit<ITask, 'to'> & { targetId: string };

/** Where a task leads: the Discounts queue, the Payment, the Expense to pay, the Refunds, the Client, or the invited User. */
const linkOf = (kind: ITask['kind'], targetId: string): ITask['to'] => {
  if (kind === 'discount') return { name: 'discount-queue' };
  if (kind === 'payment' || kind === 'payout') return { name: 'finance', query: { movement: targetId } };
  if (kind === 'expense-due') return { name: 'expense', query: { view: 'due', expense: targetId } };
  if (kind === 'refund-make' || kind === 'refund-confirm') return { name: 'finance', query: { tab: 'refunds' } };
  if (kind === 'client-at-risk') return { name: 'client-page', params: { id: targetId } };
  return { name: 'user', query: { user: targetId } };
};

class TaskApiService extends BaseService implements ITaskService {
  private _BASE_API_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/task/tasks`;

  /** The whole to-do list in one request, each kind already filtered by the person's rights. */
  async getTasks(siteId: string): Promise<ITask[]> {
    const tasks = await this.request<TaskAnswer[]>({ method: 'GET', url: this._BASE_API_URL, params: siteId === ALL_SITES ? undefined : { siteId } });
    return tasks.map((task) => ({ ...task, to: linkOf(task.kind, task.targetId) }));
  }
}

export default isMockModule('task') ? TaskMockService : TaskApiService;
