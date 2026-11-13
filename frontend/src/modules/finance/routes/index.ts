import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/finances',
    name: 'finance',
    component: () => import('finance/views/entry.vue'),
    meta: { permission: 'finance.view' },
  },
  {
    path: '/cash-desk',
    name: 'cash-desk',
    component: () => import('finance/views/cash-desk.vue'),
    meta: { permission: 'payment.record', parent: 'finance' },
  },
  {
    path: '/debts',
    name: 'debt-follow-up',
    component: () => import('finance/views/debts.vue'),
    meta: { permission: 'debt.follow', parent: 'finance' },
  },
];

export default routes;
