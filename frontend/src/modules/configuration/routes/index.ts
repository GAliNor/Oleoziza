import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/configuration',
    name: 'configuration',
    component: () => import('configuration/views/entry.vue'),
    meta: { permission: 'configuration.manage' },
  },
  {
    path: '/configuration/settings',
    name: 'configuration-settings',
    component: () => import('configuration/views/settings.vue'),
    meta: { permission: 'configuration.manage', parent: 'configuration' },
  },
];

export default routes;
