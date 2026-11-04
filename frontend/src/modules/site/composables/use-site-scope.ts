import { computed, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSiteStore } from 'site/stores/site';

/** The name of what a Management page is showing: the current Site, or every Site. */
export const useSiteScope = (): { scopeName: ComputedRef<string> } => {
  const { t } = useI18n();
  const siteStore = useSiteStore();
  const scopeName = computed((): string => (siteStore.isAllSites ? t('global.allSites') : (siteStore.currentSite?.name ?? '')));
  return { scopeName };
};
