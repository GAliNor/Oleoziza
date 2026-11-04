import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/operations',
    name: 'lot',
    component: () => import('lot/views/entry.vue'),
    meta: { roles: ['management'], permission: ['record.correct', 'audit_trail.view'] },
  },
];

export default routes;
