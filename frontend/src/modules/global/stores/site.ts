import { defineStore } from 'pinia';

import SiteService from 'global/services/site';
import { useAuthStore } from 'auth/stores/auth';
import { ALL_SITES } from 'global/constants/site';
import { STORAGE_KEYS } from 'auth/constants/auth';
import type { ISite, ISiteStore } from 'global/types/site';

const siteService = new SiteService();

const readLastSite = (userId: string): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.lastSite + userId);
  } catch {
    return null;
  }
};

export const useSiteStore = defineStore('site', {
  state: (): ISiteStore => ({
    sites: [],
    currentSiteId: null,
    loadedForUserId: null,
    isLoading: false,
    hasError: false,
  }),
  getters: {
    accessibleSites(state): ISite[] {
      const claimedSites = useAuthStore().session?.sites ?? {};
      return state.sites.filter((site) => site.id in claimedSites);
    },
    canSelectAll(): boolean {
      const claimedSites = useAuthStore().session?.sites ?? {};
      return (
        this.accessibleSites.length > 1 &&
        this.accessibleSites.every((site) => claimedSites[site.id]?.includes('finance.view'))
      );
    },
    isAllSites: (state): boolean => state.currentSiteId === ALL_SITES,
    currentSite(state): ISite | undefined {
      return this.accessibleSites.find((site) => site.id === state.currentSiteId);
    },
  },
  actions: {
    async fetchSites(isForced = false): Promise<void> {
      const userId = useAuthStore().session?.userId ?? null;
      if (!userId || (!isForced && this.loadedForUserId === userId && !this.hasError)) return;
      this.isLoading = true;
      this.hasError = false;
      try {
        this.sites = await siteService.getAll();
        if (this.loadedForUserId !== userId) this.pickInitialSite(userId);
        this.loadedForUserId = userId;
      } catch (error) {
        this.hasError = true;
        console.error(error);
      } finally {
        this.isLoading = false;
      }
    },
    pickInitialSite(userId: string): void {
      const lastSite = readLastSite(userId);
      const isLastSiteValid =
        (lastSite === ALL_SITES && this.canSelectAll) || this.accessibleSites.some((site) => site.id === lastSite);
      this.currentSiteId = isLastSiteValid ? lastSite : (this.accessibleSites[0]?.id ?? null);
    },
    selectSite(siteId: string): void {
      const userId = useAuthStore().session?.userId;
      if (siteId === ALL_SITES ? !this.canSelectAll : !this.accessibleSites.some((site) => site.id === siteId)) return;
      this.currentSiteId = siteId;
      try {
        if (userId) localStorage.setItem(STORAGE_KEYS.lastSite + userId, siteId);
      } catch {
        return;
      }
    },
    reset(): void {
      this.sites = [];
      this.currentSiteId = null;
      this.loadedForUserId = null;
      this.hasError = false;
    },
  },
});
