// imports
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

// variables
const modules = import.meta.glob<RouteRecordRaw[]>('../modules/*/routes/index.ts', { eager: true, import: 'default' });
const routes = Object.values(modules).flat();

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...routes, { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } }],
});

export default router;
