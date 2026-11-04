import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'global/stores/site';
import { HOME_ROUTE_NAME, NAV_ITEMS } from 'global/constants/navigation';
import type { INavItem } from 'global/types/navigation';

export const useNavigation = () => {
  // stores
  const sessionStore = useSessionStore();
  const siteStore = useSiteStore();

  // methods
  const canOpen = (item: INavItem): boolean => {
    const role = sessionStore.session?.role;
    if (!role) return false;
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.permission && !siteStore.can(item.permission)) return false;
    if (item.managementPermission && role === 'management' && !siteStore.can(item.managementPermission)) return false;
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
