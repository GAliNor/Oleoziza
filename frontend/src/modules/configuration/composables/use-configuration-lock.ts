import { computed, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSiteStore } from 'site/stores/site';
import { useOnlineStatus } from 'global/composables/use-online-status';

/** Why a Site's settings can't be changed right now, in words; null when they can. */
export const useConfigurationLock = (siteId: () => string): ComputedRef<string | null> => {
  // stores
  const { t } = useI18n();
  const siteStore = useSiteStore();
  const { isOnline } = useOnlineStatus();

  return computed((): string | null => {
    if (siteStore.isAllSites) return t('global.locked.allSites');
    if (!siteStore.hasPermission('configuration.manage', siteId())) return t('global.locked.noRight');
    return isOnline.value ? null : t('global.locked.offline');
  });
};
