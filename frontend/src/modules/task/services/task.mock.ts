import { deriveTasks, loadTaskSources } from 'task/composables/derive-tasks';
import type { ITask, ITaskService } from 'task/types/task';

/** The tasks the mock modules hold, derived in the front with the rules the backend applies. */
export default class TaskMockService implements ITaskService {
  async getTasks(siteId: string): Promise<ITask[]> {
    await loadTaskSources(siteId);
    return deriveTasks();
  }
}
