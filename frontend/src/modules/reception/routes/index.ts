import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/reception/new',
    name: 'reception-new',
    component: () => import('reception/views/new.vue'),
    meta: { permission: ['reception.create', 'client.create'], parent: 'lot' },
  },
];

export default routes;
