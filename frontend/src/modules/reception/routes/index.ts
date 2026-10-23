import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/reception/new',
    name: 'reception-new',
    component: () => import('reception/views/new.vue'),
    meta: { roles: ['operator', 'management'], permission: 'reception.create' },
  },
  {
    path: '/reception/weigh',
    name: 'reception-weigh',
    component: () => import('reception/views/weigh.vue'),
    meta: { roles: ['operator', 'management'], permission: 'weighing.create' },
  },
  {
    path: '/reception/:code/weigh',
    name: 'reception-station',
    component: () => import('reception/views/station.vue'),
    meta: { roles: ['operator', 'management'], permission: 'weighing.create' },
  },
];

export default routes;
