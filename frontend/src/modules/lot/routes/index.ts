import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/operations',
    name: 'lot',
    component: () => import('lot/views/entry.vue'),
    meta: { permission: ['record.correct', 'audit_trail.view'] },
  },
  {
    path: '/discounts',
    name: 'discount-queue',
    component: () => import('lot/views/discounts.vue'),
    meta: { permission: 'discount.approve' },
  },
];

export default routes;
