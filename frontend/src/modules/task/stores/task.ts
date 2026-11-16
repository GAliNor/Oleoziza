import { defineStore } from 'pinia';

import TaskService from 'task/services/task';
import { cachedLoad, invalidateLoads, LOAD_TTL_MS } from 'global/composables/cached-load';
import { withStatus } from 'global/composables/with-status';
import type { ITaskStore } from 'task/types/task';

const taskService = new TaskService();

/** What waits on the signed-in person: one request, shared by the shell's badge and the To-do page. */
export const useTaskStore = defineStore('task', {
  state: (): ITaskStore => ({
    tasks: [],
    isLoading: false,
    hasError: false,
  }),
  actions: {
    async fetchTasks(siteId: string, isForced = false): Promise<void> {
      await withStatus(
        this,
        'isLoading',
        () =>
          cachedLoad(
            `tasks:${siteId}`,
            LOAD_TTL_MS.records,
            async () => {
              this.tasks = await taskService.getTasks(siteId);
            },
            isForced,
          ),
        { errorFlag: 'hasError' },
      );
    },
    /** A decision settled a task: the next load asks the server. */
    markStale(): void {
      invalidateLoads('tasks:');
    },
  },
});
