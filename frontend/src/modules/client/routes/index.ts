import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/clients',
    name: 'client-search',
    component: () => import('client/views/search.vue'),
    meta: { roles: ['operator', 'management'] },
  },
  {
    path: '/clients/:id',
    name: 'client-page',
    component: () => import('client/prototype/client-page.prototype.vue'),
    meta: { roles: ['operator', 'management'] },
  },
];

export default routes;
