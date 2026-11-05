import type { RouteRecordRaw } from 'vue-router';

import { TASK_PERMISSIONS, TASK_ROUTE_NAME } from 'task/constants/task';

const routes: RouteRecordRaw[] = [
  {
    path: '/tasks',
    name: TASK_ROUTE_NAME,
    component: () => import('task/views/entry.vue'),
    meta: { permission: TASK_PERMISSIONS },
  },
];

export default routes;
