import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from 'global/stores/session';
import SiteMockService from 'site/services/site.mock';
import { useSiteStore } from 'site/stores/site';
import { ALL_SITES } from 'site/constants/site';
import type { ISession, Permission } from 'global/types/session';

const OUJDA = 'site-oujda';
const BERKANE = 'site-berkane';
const TAOURIRT = 'site-taourirt';

const signIn = (sites: Record<string, Permission[]>, isOwner = false): void => {
  const session: ISession = { userId: 'u1', sid: 's1', role: 'management', isOwner, sites, firstName: 'Ali', lastName: 'Guedda', expiresAt: 0 };
  useSessionStore().session = session;
};

describe('site store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useSiteStore().sites = [
      { id: OUJDA, name: 'Oujda', city: 'Oujda' },
      { id: BERKANE, name: 'Berkane', city: 'Berkane' },
      { id: TAOURIRT, name: 'Taourirt', city: 'Taourirt' },
    ];
  });

  it('shows a User only the Sites they hold', () => {
    signIn({ [OUJDA]: [], [BERKANE]: [] });
    expect(useSiteStore().accessibleSites.map((site) => site.id)).toEqual([OUJDA, BERKANE]);
  });

  it('shows the owner every Site', () => {
    signIn({}, true);
    expect(useSiteStore().accessibleSites).toHaveLength(3);
  });

  it('offers all Sites only with finance.view on every held Site', () => {
    signIn({ [OUJDA]: ['finance.view'], [BERKANE]: [] });
    expect(useSiteStore().canSelectAll).toBe(false);
    signIn({ [OUJDA]: ['finance.view'], [BERKANE]: ['finance.view'] });
    expect(useSiteStore().canSelectAll).toBe(true);
  });

  it('grants a list of Permissions when any one of them is held on the current Site', () => {
    signIn({ [OUJDA]: ['audit_trail.view'] });
    const siteStore = useSiteStore();
    siteStore.selectSite(OUJDA);
    expect([siteStore.can(['record.correct', 'audit_trail.view']), siteStore.can(['record.correct', 'user.manage']), siteStore.can('audit_trail.view')]).toEqual([true, false, true]);
  });

  it('refuses a Site the User does not hold, and all Sites without the right', () => {
    signIn({ [OUJDA]: [], [BERKANE]: [] });
    const siteStore = useSiteStore();
    siteStore.selectSite(BERKANE);
    siteStore.selectSite(TAOURIRT);
    siteStore.selectSite(ALL_SITES);
    expect(siteStore.currentSiteId).toBe(BERKANE);
  });
});

describe('site store remembered Site', () => {
  beforeEach(() => {
    const memory = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string): string | null => memory.get(key) ?? null,
      setItem: (key: string, value: string): void => void memory.set(key, value),
      removeItem: (key: string): void => void memory.delete(key),
    });
    vi.spyOn(SiteMockService.prototype, 'getAll').mockResolvedValue([
      { id: OUJDA, name: 'Oujda', city: 'Oujda' },
      { id: BERKANE, name: 'Berkane', city: 'Berkane' },
    ]);
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens on the first held Site, then on the one the User last picked', async () => {
    signIn({ [OUJDA]: [], [BERKANE]: [] });
    const siteStore = useSiteStore();
    await siteStore.fetchSites();
    expect(siteStore.currentSiteId).toBe(OUJDA);
    siteStore.selectSite(BERKANE);
    siteStore.reset();
    await siteStore.fetchSites();
    expect(siteStore.currentSiteId).toBe(BERKANE);
  });
});

describe('site store saving', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
    signIn({}, true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates a Site and shows it in the reloaded list', async () => {
    const siteStore = useSiteStore();
    const created = await siteStore.save({ name: 'Huilerie Taourirt', city: 'Taourirt' });
    expect(siteStore.sites.map((site) => site.id)).toContain(created?.id);
    await siteStore.remove(created?.id ?? '');
    expect(siteStore.sites.map((site) => site.id)).not.toContain(created?.id);
  });

  it('moves the current Site away when it is removed', async () => {
    const siteStore = useSiteStore();
    const created = await siteStore.save({ name: 'Huilerie Taourirt', city: 'Taourirt' });
    siteStore.selectSite(created?.id ?? '');
    await siteStore.remove(created?.id ?? '');
    expect(siteStore.currentSiteId).not.toBe(created?.id);
  });

  it('reports a failed save apart from a failed load', async () => {
    vi.spyOn(SiteMockService.prototype, 'create').mockRejectedValue(new Error('down'));
    const siteStore = useSiteStore();
    expect(await siteStore.save({ name: 'X', city: 'Y' })).toBeNull();
    expect([siteStore.hasSaveError, siteStore.hasError, siteStore.isSaving]).toEqual([true, false, false]);
    siteStore.clearSaveError();
    expect(siteStore.hasSaveError).toBe(false);
  });
});
