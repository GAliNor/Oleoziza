import { defineStore } from 'pinia';

import SiteService from 'site/services/site';
import { withStatus } from 'global/composables/with-status';
import { readStorage, writeStorage } from 'global/composables/storage';
import { useSessionStore } from 'global/stores/session';
import { OPERATOR_WORKSPACE_PERMISSIONS } from 'auth/constants/permissions';
import { ALL_SITES, LAST_SITE_STORAGE_KEY } from 'site/constants/site';
import type { Permission } from 'global/types/session';
import type { ISite, ISiteForm, ISiteStore } from 'site/types/site';

const siteService = new SiteService();

export const useSiteStore = defineStore('site', {
  state: (): ISiteStore => ({
    sites: [],
    currentSiteId: null,
    loadedForUserId: null,
    isLoading: false,
    hasError: false,
    isSaving: false,
    hasSaveError: false,
    saveErrorCode: null,
  }),
  getters: {
    hasPermission(): (permission: Permission, siteId: string | null) => boolean {
      return (permission: Permission, siteId: string | null): boolean => {
        const session = useSessionStore().session;
        const sites = session?.sites ?? {};
        if (!siteId) return false;
        if (session?.isOwner) return true;
        if (session?.role === 'operator' && !OPERATOR_WORKSPACE_PERMISSIONS.includes(permission)) return false;
        if (siteId === ALL_SITES) {
          const siteIds = Object.keys(sites);
          return siteIds.length > 0 && siteIds.every((id) => sites[id].includes(permission));
        }
        return sites[siteId]?.includes(permission) ?? false;
      };
    },
    /** Whether the current Site grants the Permission, or any one of a list; an Owner awaiting their first Site may only manage Sites. */
    can(state): (permission: Permission | readonly Permission[]) => boolean {
      return (permission: Permission | readonly Permission[]): boolean => {
        const permissions = typeof permission === 'string' ? [permission] : permission;
        if (this.isAwaitingFirstSite) return permissions.includes('site.manage');
        return permissions.some((item) => this.hasPermission(item, state.currentSiteId));
      };
    },
    /** A fresh production start: the Owner is signed in and no Site exists yet, so every other page has nothing to show. */
    isAwaitingFirstSite(state): boolean {
      return useSessionStore().session?.isOwner === true && state.loadedForUserId !== null && state.sites.length === 0;
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
      this.hasSaveError = false;
    },
    /** Saves and puts the answer in the list: no reload. */
    async save(form: ISiteForm, id?: string): Promise<ISite | null> {
      const site = await withStatus(this, 'isSaving', () => (id ? siteService.update(id, form) : siteService.create(form)), { errorFlag: 'hasSaveError', errorCode: 'saveErrorCode' });
      if (!site) return null;
      const index = this.sites.findIndex((item) => item.id === site.id);
      if (index === -1) this.sites.push(site);
      else this.sites.splice(index, 1, site);
      if (!this.currentSiteId) this.selectSite(site.id);
      return site;
    },
    async remove(id: string): Promise<boolean> {
      const isRemoved = await withStatus(
        this,
        'isSaving',
        async () => {
          await siteService.delete(id);
          return true;
        },
        { errorFlag: 'hasSaveError', errorCode: 'saveErrorCode' },
      );
      if (!isRemoved) return false;
      this.sites = this.sites.filter((site) => site.id !== id);
      const userId = useSessionStore().session?.userId;
      if (this.currentSiteId === id && userId) this.pickInitialSite(userId);
      return true;
    },
    clearSaveError(): void {
      this.hasSaveError = false;
      this.saveErrorCode = null;
    },
  },
});
