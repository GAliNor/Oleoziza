import { defineStore } from 'pinia';

import SiteAdminService from 'site/services/site';
import { useSiteStore } from 'global/stores/site';
import type { ISiteAdminStore, ISiteForm } from 'site/types/site';

const siteAdminService = new SiteAdminService();

export const useSiteAdminStore = defineStore('site-admin', {
  state: (): ISiteAdminStore => ({
    isSaving: false,
    hasError: false,
  }),
  actions: {
    async save(form: ISiteForm, id?: string): Promise<boolean> {
      this.isSaving = true;
      this.hasError = false;
      try {
        if (id) await siteAdminService.update(id, form);
        else await siteAdminService.create(form);
        await useSiteStore().fetchSites(true);
        return true;
      } catch (error) {
        this.hasError = true;
        console.error(error);
        return false;
      } finally {
        this.isSaving = false;
      }
    },
  },
});
