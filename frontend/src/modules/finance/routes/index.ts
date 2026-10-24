import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/finances',
    name: 'finance',
    component: () => import('finance/prototype/finances-page.prototype.vue'),
    meta: { roles: ['management'], permission: 'finance.view' },
  },
];

export default routes;
