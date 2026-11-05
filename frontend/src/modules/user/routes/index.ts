import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/users',
    name: 'user',
    component: () => import('user/views/entry.vue'),
    meta: { permission: 'user.manage' },
  },
];

export default routes;
