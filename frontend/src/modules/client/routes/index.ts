import type { RouteRecordRaw } from 'vue-router';

import { checkParam } from 'global/composables/route-guards';
import { ID_PARAM_PATTERN } from 'global/constants/route-params';

const routes: RouteRecordRaw[] = [
  {
    path: '/clients',
    name: 'client-search',
    component: () => import('client/prototype/clients-entry.prototype.vue'),
    meta: { roles: ['operator', 'management'] },
  },
  {
    path: '/clients/:id',
    name: 'client-page',
    component: () => import('client/prototype/client-page.prototype.vue'),
    beforeEnter: checkParam('id', { pattern: ID_PARAM_PATTERN, fallback: { name: 'client-search' } }),
    meta: { roles: ['operator', 'management'] },
  },
];

export default routes;
