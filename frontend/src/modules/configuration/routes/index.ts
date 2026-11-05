import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/configuration',
    name: 'configuration',
    component: () => import('configuration/views/entry.vue'),
    meta: { permission: 'configuration.manage' },
  },
];

export default routes;
