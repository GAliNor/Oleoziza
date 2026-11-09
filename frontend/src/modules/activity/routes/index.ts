import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/activity',
    name: 'activity',
    component: () => import('activity/views/entry.vue'),
    meta: { permission: 'audit_trail.view' },
  },
];

export default routes;
