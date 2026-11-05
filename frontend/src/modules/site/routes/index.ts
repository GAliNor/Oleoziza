import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/sites',
    name: 'site',
    component: () => import('site/views/entry.vue'),
    meta: { permission: 'site.manage' },
  },
];

export default routes;
