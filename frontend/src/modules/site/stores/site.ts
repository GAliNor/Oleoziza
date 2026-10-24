import { defineStore } from 'pinia';

import SiteAdminService from 'site/services/site';
import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
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
      this.isSaving = true;
      this.hasError = false;
      try {
        const site = id ? await siteAdminService.update(id, form) : await siteAdminService.create(form);
        await useSiteStore().fetchSites(true);
        return site;
      } catch (error) {
        this.hasError = true;
        console.error(error);
        return null;
      } finally {
        this.isSaving = false;
      }
    },
    async remove(id: string): Promise<boolean> {
      const siteStore = useSiteStore();
      this.isSaving = true;
      this.hasError = false;
      try {
        await siteAdminService.delete(id);
        await siteStore.fetchSites(true);
        const userId = useAuthStore().session?.userId;
        if (siteStore.currentSiteId === id && userId) siteStore.pickInitialSite(userId);
        return true;
      } catch (error) {
        this.hasError = true;
        console.error(error);
        return false;
      } finally {
        this.isSaving = false;
      }
    },
    clearError(): void {
      this.hasError = false;
    },
  },
});
