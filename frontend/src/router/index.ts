// imports
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { useNavigation } from 'global/composables/use-navigation';
import { HOME_ROUTE_NAME } from 'global/constants/navigation';

// variables
const modules = import.meta.glob<RouteRecordRaw[]>('../modules/*/routes/index.ts', { eager: true, import: 'default' });
const routes = Object.values(modules).flat();

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...routes, { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } }],
});

// guards
router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  await authStore.init();

  if (to.meta.public) {
    const isLoggedIn = authStore.isAuthenticated && !authStore.mustChangeCredential;
    return to.meta.guestOnly && isLoggedIn ? { name: 'dashboard' } : true;
  }
  if (!authStore.session) return { name: 'auth-login', query: { redirect: to.fullPath } };
  if (authStore.mustChangeCredential && to.name !== 'auth-change-credential') {
    return { name: 'auth-change-credential', query: { redirect: to.fullPath } };
  }
  if (to.meta.roles && !to.meta.roles.includes(authStore.session.role)) return { name: 'dashboard' };
  if (authStore.isStaff) await useSiteStore().fetchSites();
  if (to.meta.permission && !authStore.can(to.meta.permission)) return { name: HOME_ROUTE_NAME };
  if (to.name === HOME_ROUTE_NAME) {
    const { canOpenHome, getLandingRoute } = useNavigation();
    if (!canOpenHome()) return getLandingRoute() ?? true;
  }
  return true;
});

export default router;
