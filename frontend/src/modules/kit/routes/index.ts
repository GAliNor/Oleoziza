import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = import.meta.env.DEV
  ? [
      {
        path: '/kit',
        name: 'kit',
        component: () => import('kit/views/entry.vue'),
        meta: { public: true },
      },
    ]
  : [];

export default routes;
