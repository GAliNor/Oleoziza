import { computed, type ComputedRef } from 'vue';
import { useRouter } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { useNavigation } from 'global/composables/use-navigation';
import { BACKOFFICE_PERMISSIONS, HOME_ROUTE_NAME } from 'global/constants/navigation';

/** An Operator's way into the Backoffice and back, with no new login. */
export const useBackofficeJump = (): { canJump: ComputedRef<boolean>; isJumped: ComputedRef<boolean>; jump: () => void; returnToOperator: () => void } => {
  const router = useRouter();
  const sessionStore = useSessionStore();
  const siteStore = useSiteStore();
  const { canOpenHome, getLandingRoute } = useNavigation();

  const canJump = computed((): boolean => sessionStore.session?.role === 'operator' && siteStore.can(BACKOFFICE_PERMISSIONS));
  const isJumped = computed((): boolean => sessionStore.session?.role === 'operator' && sessionStore.isBackofficeMode);

  const jump = (): void => {
    sessionStore.setBackofficeMode(true);
    router.push(canOpenHome() ? { name: HOME_ROUTE_NAME } : (getLandingRoute() ?? { name: HOME_ROUTE_NAME }));
  };

  const returnToOperator = (): void => {
    sessionStore.setBackofficeMode(false);
    router.push({ name: HOME_ROUTE_NAME });
  };

  return { canJump, isJumped, jump, returnToOperator };
};
