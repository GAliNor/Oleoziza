import { defineStore } from 'pinia';

import SiteService from 'global/services/site';
import type { ISite, ISiteStore } from 'global/types/site';

const siteService = new SiteService();

export const useSiteStore = defineStore('site', {
  state: (): ISiteStore => ({
    sites: [],
    currentSiteId: null,
    isLoading: false,
    hasError: false,
  }),
  getters: {
    currentSite: (state): ISite | undefined => state.sites.find((site) => site.id === state.currentSiteId),
  },
  actions: {
    async fetchSites(): Promise<void> {
      this.isLoading = true;
      this.hasError = false;
      try {
        this.sites = await siteService.getAll();
        this.currentSiteId ??= this.sites[0]?.id ?? null;
      } catch (error) {
        this.hasError = true;
        console.error(error);
      } finally {
        this.isLoading = false;
      }
    },
  },
});
