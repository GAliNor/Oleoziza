import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/charges',
    name: 'expense',
    component: () => import('expense/views/entry.vue'),
    meta: { permission: ['expense.record', 'finance.view'] },
  },
];

export default routes;
