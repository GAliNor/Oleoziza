import { computed } from 'vue';

import { useSiteStore } from 'site/stores/site';
import { useTaskStore } from 'task/stores/task';
import { TASK_GROUPS } from 'task/constants/task';
import type { ITask, TaskGroup } from 'task/types/task';

/** What Management has to act on in the current scope, read in one request. */
export const useTasks = () => {
  // stores
  const siteStore = useSiteStore();
  const taskStore = useTaskStore();

  // computed
  const tasks = computed((): ITask[] => taskStore.tasks);
  const groups = computed((): { group: TaskGroup; tasks: ITask[] }[] =>
    TASK_GROUPS.map((group) => ({ group, tasks: tasks.value.filter((task) => task.group === group) })).filter((entry) => entry.tasks.length),
  );

  // methods
  /** Shared and cached, so the shell can call it on every screen. */
  const load = async (): Promise<void> => {
    if (siteStore.currentSiteId) await taskStore.fetchTasks(siteStore.currentSiteId);
  };

  return { tasks, groups, load };
};
