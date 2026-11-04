import { defineStore } from 'pinia';

import SiteService from 'global/services/site';
import { withStatus } from 'global/composables/with-status';
import { readStorage, writeStorage } from 'global/composables/storage';
import { useSessionStore } from 'global/stores/session';
import { ALL_SITES, LAST_SITE_STORAGE_KEY } from 'global/constants/site';
import type { Permission } from 'global/types/session';
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
    hasPermission(): (permission: Permission, siteId: string | null) => boolean {
      return (permission: Permission, siteId: string | null): boolean => {
        const session = useSessionStore().session;
        const sites = session?.sites ?? {};
        if (!siteId) return false;
        if (session?.isOwner) return true;
        if (siteId === ALL_SITES) {
          const siteIds = Object.keys(sites);
          return siteIds.length > 0 && siteIds.every((id) => sites[id].includes(permission));
        }
        return sites[siteId]?.includes(permission) ?? false;
      };
    },
    can(state): (permission: Permission) => boolean {
      return (permission: Permission): boolean => this.hasPermission(permission, state.currentSiteId);
    },
    accessibleSites(state): ISite[] {
      const session = useSessionStore().session;
      if (session?.isOwner) return state.sites;
      const claimedSites = session?.sites ?? {};
      return state.sites.filter((site) => site.id in claimedSites);
    },
    canSelectAll(): boolean {
      return this.accessibleSites.length > 1 && this.accessibleSites.every((site) => this.hasPermission('finance.view', site.id));
    },
    isAllSites: (state): boolean => state.currentSiteId === ALL_SITES,
    currentSite(state): ISite | undefined {
      return this.accessibleSites.find((site) => site.id === state.currentSiteId);
    },
  },
  actions: {
    async fetchSites(isForced = false): Promise<void> {
      const userId = useSessionStore().session?.userId ?? null;
      if (!userId || (!isForced && this.loadedForUserId === userId && !this.hasError)) return;
      const sites = await withStatus(this, 'isLoading', () => siteService.getAll(), { errorFlag: 'hasError' });
      if (!sites) return;
      this.sites = sites;
      if (this.loadedForUserId !== userId) this.pickInitialSite(userId);
      this.loadedForUserId = userId;
    },
    pickInitialSite(userId: string): void {
      const lastSite = readStorage<string | null>(LAST_SITE_STORAGE_KEY + userId, null);
      const isLastSiteValid =
        (lastSite === ALL_SITES && this.canSelectAll) || this.accessibleSites.some((site) => site.id === lastSite);
      this.currentSiteId = isLastSiteValid ? lastSite : (this.accessibleSites[0]?.id ?? null);
    },
    selectSite(siteId: string): void {
      const userId = useSessionStore().session?.userId;
      if (siteId === ALL_SITES ? !this.canSelectAll : !this.accessibleSites.some((site) => site.id === siteId)) return;
      this.currentSiteId = siteId;
      if (userId) writeStorage(LAST_SITE_STORAGE_KEY + userId, siteId);
    },
    reset(): void {
      this.sites = [];
      this.currentSiteId = null;
      this.loadedForUserId = null;
      this.hasError = false;
    },
  },
});
