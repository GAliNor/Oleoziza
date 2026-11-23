import { defineStore } from 'pinia';

import TaskService from 'task/services/task';
import { invalidateLoads, LOAD_TTL_MS, slotLoad } from 'global/composables/cached-load';
import { withStatus } from 'global/composables/with-status';
import { withClientTaskLinks } from 'task/composables/client-task-links';
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
          slotLoad(
            'tasks',
            siteId,
            LOAD_TTL_MS.records,
            () => taskService.getTasks(siteId),
            (tasks) => {
              this.tasks = tasks.map((task) => ('targetId' in task && typeof task.targetId === 'string' ? withClientTaskLinks(task, task.targetId) : task));
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
