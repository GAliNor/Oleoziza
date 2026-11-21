import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from 'global/stores/session';
import SiteMockService from 'site/services/site.mock';
import { useSiteStore } from 'site/stores/site';
import { ALL_SITES } from 'site/constants/site';
import { SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { ISession, Permission } from 'global/types/session';
import type { ISite, ISiteForm } from 'site/types/site';
import type { ProvinceId } from 'territory/types/territory';

const OUJDA = 'site-oujda';
const BERKANE = 'site-berkane';
const TAOURIRT = 'site-taourirt';

const signIn = (sites: Record<string, Permission[]>, isOwner = false): void => {
  const session: ISession = { userId: 'u1', role: 'management', isOwner, sites, firstName: 'Ali', lastName: 'Guedda', expiresAt: 0 };
  useSessionStore().session = session;
};

const testSite = (id: string, code: string, name: string, province: ProvinceId): ISite => ({ id, code, name, province, city: name, address: 'Centre', phone: null, status: 'active' });

const taourirtForm: ISiteForm = { code: 'TA', name: 'Huilerie Taourirt', location: { province: 'taourirt', city: 'Taourirt', address: 'Centre' }, phone: null };

describe('site store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useSiteStore().sites = [
      testSite(OUJDA, 'OJ', 'Oujda', 'oujda-angad'),
      testSite(BERKANE, 'BK', 'Berkane', 'berkane'),
      testSite(TAOURIRT, 'TA', 'Taourirt', 'taourirt'),
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
      testSite(OUJDA, 'OJ', 'Oujda', 'oujda-angad'),
      testSite(BERKANE, 'BK', 'Berkane', 'berkane'),
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

  it('creates a Site and puts it in the list without reloading', async () => {
    const siteStore = useSiteStore();
    const created = await siteStore.save(taourirtForm);
    expect(siteStore.sites.map((site) => site.id)).toContain(created?.id);
    await siteStore.remove(created?.id ?? '');
    expect(siteStore.sites.map((site) => site.id)).not.toContain(created?.id);
  });

  it('moves the current Site away when it is removed', async () => {
    const siteStore = useSiteStore();
    const created = await siteStore.save(taourirtForm);
    siteStore.selectSite(created?.id ?? '');
    await siteStore.remove(created?.id ?? '');
    expect(siteStore.currentSiteId).not.toBe(created?.id);
  });

  it('keeps a taken code for the form to explain', async () => {
    const siteStore = useSiteStore();
    expect(await siteStore.save({ ...taourirtForm, code: 'OJ' })).toBeNull();
    expect(siteStore.saveErrorCode).toBe('code_taken');
  });

  it('refuses to delete a Site that already holds records', async () => {
    const siteStore = useSiteStore();
    expect(await siteStore.remove(SITE_OUJDA_ID)).toBe(false);
    expect(siteStore.saveErrorCode).toBe('site_has_records');
  });

  it('reports a failed save apart from a failed load', async () => {
    vi.spyOn(SiteMockService.prototype, 'create').mockRejectedValue(new Error('down'));
    const siteStore = useSiteStore();
    expect(await siteStore.save(taourirtForm)).toBeNull();
    expect([siteStore.hasSaveError, siteStore.hasError, siteStore.isSaving]).toEqual([true, false, false]);
    siteStore.clearSaveError();
    expect(siteStore.hasSaveError).toBe(false);
  });
});

describe('site store before the first Site', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
    signIn({}, true);
    const siteStore = useSiteStore();
    siteStore.sites = [];
    siteStore.loadedForUserId = 'u1';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lets an Owner without any Site reach only the Sites page', () => {
    const siteStore = useSiteStore();
    expect(siteStore.isAwaitingFirstSite).toBe(true);
    expect([siteStore.can('site.manage'), siteStore.can('dashboard.view'), siteStore.can(['finance.view', 'site.manage'])]).toEqual([true, false, true]);
  });

  it('opens the first Site created, which unlocks every page for the Owner', async () => {
    const siteStore = useSiteStore();
    const created = await siteStore.save(taourirtForm);
    expect(siteStore.currentSiteId).toBe(created?.id);
    expect([siteStore.isAwaitingFirstSite, siteStore.can('dashboard.view')]).toEqual([false, true]);
  });

  it('never applies to a staff member without Sites, nor before the Sites are read', () => {
    const siteStore = useSiteStore();
    signIn({});
    expect([siteStore.isAwaitingFirstSite, siteStore.can('site.manage')]).toEqual([false, false]);
    signIn({}, true);
    siteStore.loadedForUserId = null;
    expect(siteStore.isAwaitingFirstSite).toBe(false);
  });
});
