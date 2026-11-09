import { computed, watch, type ComputedRef } from 'vue';

import { useConfigurationStore } from 'configuration/stores/configuration';
import type { IPressLineSetting, ITankSetting } from 'configuration/types/configuration';

/** A Site's Press Lines and Tanks, read once from its configuration, for screens outside the Configuration page. */
export const useSiteEquipment = (siteId: () => string | null | undefined): { pressLines: ComputedRef<IPressLineSetting[]>; tanks: ComputedRef<ITankSetting[]> } => {
  // stores
  const configurationStore = useConfigurationStore();

  // computed
  const pressLines = computed((): IPressLineSetting[] => configurationStore.bySite[siteId() ?? '']?.pressLines ?? []);
  const tanks = computed((): ITankSetting[] => configurationStore.bySite[siteId() ?? '']?.tanks ?? []);

  // watchers
  watch(
    siteId,
    (id) => {
      if (id && !configurationStore.bySite[id]) configurationStore.fetchSites([id]);
    },
    { immediate: true },
  );

  return { pressLines, tanks };
};
