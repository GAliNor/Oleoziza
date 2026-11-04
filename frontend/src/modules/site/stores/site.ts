import { defineStore } from 'pinia';

import SiteAdminService from 'site/services/site';
import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'global/stores/site';
import { withStatus } from 'global/composables/with-status';
import type { ISite } from 'global/types/site';
import type { ISiteAdminStore, ISiteForm } from 'site/types/site';

const siteAdminService = new SiteAdminService();

export const useSiteAdminStore = defineStore('site-admin', {
  state: (): ISiteAdminStore => ({
    isSaving: false,
    hasError: false,
  }),
  actions: {
    async save(form: ISiteForm, id?: string): Promise<ISite | null> {
      return withStatus(
        this,
        'isSaving',
        async () => {
          const site = id ? await siteAdminService.update(id, form) : await siteAdminService.create(form);
          await useSiteStore().fetchSites(true);
          return site;
        },
        { errorFlag: 'hasError' },
      );
    },
    async remove(id: string): Promise<boolean> {
      const siteStore = useSiteStore();
      const isRemoved = await withStatus(
        this,
        'isSaving',
        async () => {
          await siteAdminService.delete(id);
          await siteStore.fetchSites(true);
          const userId = useSessionStore().session?.userId;
          if (siteStore.currentSiteId === id && userId) siteStore.pickInitialSite(userId);
          return true;
        },
        { errorFlag: 'hasError' },
      );
      return isRemoved ?? false;
    },
    clearError(): void {
      this.hasError = false;
    },
  },
});
