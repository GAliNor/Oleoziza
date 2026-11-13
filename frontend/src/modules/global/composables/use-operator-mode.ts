import { computed, type ComputedRef } from 'vue';
import { useRouter } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { HOME_ROUTE_NAME } from 'global/constants/navigation';
import type { Permission } from 'global/types/session';

const OPERATOR_PERMISSIONS: readonly Permission[] = ['reception.create', 'pressing.create', 'withdrawal.create'];

/** Management's way into the Operator Workspace and back, for when it must work as an Operator, with no new login. */
export const useOperatorMode = (): { canWorkAsOperator: ComputedRef<boolean>; isOperatorMode: ComputedRef<boolean>; workAsOperator: () => void; returnToManagement: () => void } => {
  const router = useRouter();
  const sessionStore = useSessionStore();
  const siteStore = useSiteStore();

  const canWorkAsOperator = computed((): boolean => sessionStore.session?.role === 'management' && siteStore.accessibleSites.some((site) => OPERATOR_PERMISSIONS.some((permission) => siteStore.hasPermission(permission, site.id))));
  const isOperatorMode = computed((): boolean => sessionStore.session?.role === 'management' && sessionStore.isOperatorMode);

  const workAsOperator = (): void => {
    if (siteStore.isAllSites || !siteStore.currentSite) {
      const site = siteStore.accessibleSites.find((candidate) => OPERATOR_PERMISSIONS.some((permission) => siteStore.hasPermission(permission, candidate.id)));
      if (site) siteStore.selectSite(site.id);
    }
    sessionStore.setOperatorMode(true);
    router.push({ name: HOME_ROUTE_NAME });
  };

  const returnToManagement = (): void => {
    sessionStore.setOperatorMode(false);
    router.push({ name: HOME_ROUTE_NAME });
  };

  return { canWorkAsOperator, isOperatorMode, workAsOperator, returnToManagement };
};
