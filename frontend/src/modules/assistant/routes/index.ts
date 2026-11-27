import type { RouteRecordRaw } from 'vue-router';

import { HOME_ROUTE_NAME } from 'global/constants/navigation';

const routes: RouteRecordRaw[] = [
  {
    path: '/assistant',
    name: 'assistant-history',
    component: () => import('assistant/views/history.vue'),
    meta: { isManagementOnly: true, parent: HOME_ROUTE_NAME },
  },
];

export default routes;
