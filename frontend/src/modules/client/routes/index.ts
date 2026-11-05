import type { RouteRecordRaw } from 'vue-router';

import { checkParam } from 'global/composables/route-guards';
import { ID_PARAM_PATTERN } from 'global/constants/route-params';

const routes: RouteRecordRaw[] = [
  {
    path: '/clients',
    name: 'client-search',
    component: () => import('client/views/entry.vue'),
    meta: { permission: 'client.view' },
  },
  {
    path: '/clients/:id',
    name: 'client-page',
    component: () => import('client/views/detail.vue'),
    beforeEnter: checkParam('id', { pattern: ID_PARAM_PATTERN, fallback: { name: 'client-search' } }),
    meta: { permission: 'client.view' },
  },
];

export default routes;
