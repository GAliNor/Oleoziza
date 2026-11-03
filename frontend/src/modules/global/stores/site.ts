import { defineStore } from 'pinia';

import SiteService from 'global/services/site';
import { withStatus } from 'global/composables/with-status';
import { readStorage, writeStorage } from 'global/composables/storage';
import { useAuthStore } from 'auth/stores/auth';
import { ALL_SITES } from 'global/constants/site';
import { STORAGE_KEYS } from 'auth/constants/auth';
import type { ISite, ISiteStore } from 'global/types/site';

const siteService = new SiteService();


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
      const session = useAuthStore().session;
      if (session?.isOwner) return state.sites;
      const claimedSites = session?.sites ?? {};
      return state.sites.filter((site) => site.id in claimedSites);
    },
    canSelectAll(): boolean {
      const authStore = useAuthStore();
      return this.accessibleSites.length > 1 && this.accessibleSites.every((site) => authStore.hasPermission('finance.view', site.id));
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
      const sites = await withStatus(this, 'isLoading', () => siteService.getAll(), { errorFlag: 'hasError' });
      if (!sites) return;
      this.sites = sites;
      if (this.loadedForUserId !== userId) this.pickInitialSite(userId);
      this.loadedForUserId = userId;
    },
    pickInitialSite(userId: string): void {
      const lastSite = readStorage<string | null>(STORAGE_KEYS.lastSite + userId, null);
      const isLastSiteValid =
        (lastSite === ALL_SITES && this.canSelectAll) || this.accessibleSites.some((site) => site.id === lastSite);
      this.currentSiteId = isLastSiteValid ? lastSite : (this.accessibleSites[0]?.id ?? null);
    },
    selectSite(siteId: string): void {
      const userId = useAuthStore().session?.userId;
      if (siteId === ALL_SITES ? !this.canSelectAll : !this.accessibleSites.some((site) => site.id === siteId)) return;
      this.currentSiteId = siteId;
      if (userId) writeStorage(STORAGE_KEYS.lastSite + userId, siteId);
    },
    reset(): void {
      this.sites = [];
      this.currentSiteId = null;
      this.loadedForUserId = null;
      this.hasError = false;
    },
  },
});
