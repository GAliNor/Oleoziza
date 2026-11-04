import type { RouteRecordRaw } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { checkParam } from 'global/composables/route-guards';
import { TOKEN_PARAM_PATTERN } from 'global/constants/route-params';

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
        beforeEnter: checkParam('token', { pattern: TOKEN_PARAM_PATTERN, fallback: { name: 'auth-login' } }),
        meta: { public: true, guestOnly: true },
      },
      {
        path: '/reset/:token?',
        name: 'auth-reset',
        component: () => import('auth/views/reset.vue'),
        beforeEnter: checkParam('token', { pattern: TOKEN_PARAM_PATTERN, fallback: { name: 'auth-reset' }, isOptional: true }),
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
  {
    path: '/logout',
    name: 'auth-logout',
    component: () => import('auth/views/login.vue'),
    meta: { public: true },
    beforeEnter: async () => {
      await useAuthStore().logout();
      return { name: 'auth-login' };
    },
  },
  {
    path: '/lock',
    name: 'auth-lock',
    component: () => import('auth/views/switch.vue'),
    meta: { public: true },
    beforeEnter: () => {
      useAuthStore().lock();
      return { name: 'auth-switch' };
    },
  },
];

export default routes;
