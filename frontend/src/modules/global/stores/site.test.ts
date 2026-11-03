import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { ALL_SITES } from 'global/constants/site';
import type { ISession, Permission } from 'auth/types/auth';

const OUJDA = 'site-oujda';
const BERKANE = 'site-berkane';
const TAOURIRT = 'site-taourirt';

const signIn = (sites: Record<string, Permission[]>, isOwner = false): void => {
  const session: ISession = { userId: 'u1', sid: 's1', role: 'management', isOwner, sites, firstName: 'Ali', lastName: 'Guedda', expiresAt: 0 };
  useAuthStore().session = session;
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

  it('refuses a Site the User does not hold, and all Sites without the right', () => {
    signIn({ [OUJDA]: [], [BERKANE]: [] });
    const siteStore = useSiteStore();
    siteStore.selectSite(BERKANE);
    siteStore.selectSite(TAOURIRT);
    siteStore.selectSite(ALL_SITES);
    expect(siteStore.currentSiteId).toBe(BERKANE);
  });
});
