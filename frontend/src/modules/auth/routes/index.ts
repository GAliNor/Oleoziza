import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    redirect: { name: 'auth-login' },
    component: () => import('auth/components/auth-layout.vue'),
    children: [
      {
        path: '/login',
        name: 'auth-login',
        component: () => import('auth/views/login.vue'),
        meta: { public: true, guestOnly: true },
      },
      {
        path: '/invitation/:token',
        name: 'auth-invitation',
        component: () => import('auth/views/invitation.vue'),
        meta: { public: true, guestOnly: true },
      },
      {
        path: '/reset/:token?',
        name: 'auth-reset',
        component: () => import('auth/views/reset.vue'),
        meta: { public: true, guestOnly: true },
      },
      {
        path: '/change-credential',
        name: 'auth-change-credential',
        component: () => import('auth/views/change-credential.vue'),
      },
      {
        path: '/switch',
        name: 'auth-switch',
        component: () => import('auth/views/switch.vue'),
        meta: { public: true, guestOnly: true },
      },
    ],
  },
];

export default routes;
