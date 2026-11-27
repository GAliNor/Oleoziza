import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/configuration/ai',
    name: 'ai',
    component: () => import('ai/views/entry.vue'),
    meta: { isOwnerOnly: true, parent: 'configuration' },
  },
];

export default routes;
