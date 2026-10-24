import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/operations',
    name: 'lot',
    component: () => import('lot/prototype/operations-page.prototype.vue'),
    meta: { roles: ['management'], permission: 'audit_trail.view' },
  },
];

export default routes;
