import type { ISite } from 'site/types/site';

export const SITE_OUJDA_ID = '7d1c2a4e-1f0b-4a51-9c39-1a2b3c4d5e01';
export const SITE_BERKANE_ID = '7d1c2a4e-1f0b-4a51-9c39-1a2b3c4d5e02';

export const SITES_MOCK: ISite[] = [
  { id: SITE_OUJDA_ID, name: 'AMANA OLIVE D’ORIENT', city: 'Oujda' },
  { id: SITE_BERKANE_ID, name: 'Huilerie Berkane', city: 'Berkane' },
];

const SEASON_REVENUE_MOCK: Record<string, number> = { [SITE_OUJDA_ID]: 412800, [SITE_BERKANE_ID]: 268500 };

/** How much of the owner's activity a Site makes; 1 for all Sites. Mock figures scale with it. */
export const mockSiteShare = (siteId: string): number => {
  const total = Object.values(SEASON_REVENUE_MOCK).reduce((sum, revenue) => sum + revenue, 0);
  return (SEASON_REVENUE_MOCK[siteId] ?? total) / total;
};
