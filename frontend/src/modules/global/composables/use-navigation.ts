import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { HOME_ROUTE_NAME, NAV_ITEMS } from 'global/constants/navigation';
import type { INavItem } from 'global/types/navigation';

export const useNavigation = () => {
  // stores
  const authStore = useAuthStore();

  // methods
  const canOpen = (item: INavItem): boolean => {
    const role = authStore.session?.role;
    if (!role) return false;
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.permission && !authStore.can(item.permission)) return false;
    if (item.managementPermission && role === 'management' && !authStore.can(item.managementPermission)) return false;
    return true;
  };

  const canOpenHome = (): boolean => canOpen(NAV_ITEMS.find((item) => item.name === HOME_ROUTE_NAME)!);

  const getLandingRoute = (): RouteLocationRaw | null => {
    const item = NAV_ITEMS.find((candidate) => candidate.name !== HOME_ROUTE_NAME && canOpen(candidate));
    return item ? { name: item.name } : null;
  };

  // computed
  const visibleNavItems = computed((): INavItem[] => NAV_ITEMS.filter(canOpen));

  return { visibleNavItems, canOpen, canOpenHome, getLandingRoute };
};
