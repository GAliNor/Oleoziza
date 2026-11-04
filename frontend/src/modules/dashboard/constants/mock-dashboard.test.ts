import { describe, expect, it } from 'vitest';

import { dashboardMock } from 'dashboard/constants/mock-dashboard';
import { ALL_SITES } from 'site/constants/site';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';

describe('dashboardMock', () => {
  it('keeps each Site to its own Tanks and storage', () => {
    const { tanks, tankStorage } = dashboardMock(SITE_OUJDA_ID, 'week');
    expect(tanks.every((tank) => tank.siteId === SITE_OUJDA_ID)).toBe(true);
    expect(tankStorage.every((entry) => tanks.some((tank) => tank.id === entry.tankId))).toBe(true);
  });

  it('shows every Site under all Sites', () => {
    const { sites, tanks } = dashboardMock(ALL_SITES, 'week');
    expect([sites.length, tanks.length]).toEqual([2, 5]);
  });

  it('adds up today from the Sites in scope', () => {
    const today = (siteId: string): number => dashboardMock(siteId, 'today').production.oliveKg;
    expect(today(SITE_OUJDA_ID) + today(SITE_BERKANE_ID)).toBe(today(ALL_SITES));
  });

  it('scales the period up for longer periods', () => {
    const olive = (period: 'week' | 'month'): number => dashboardMock(SITE_OUJDA_ID, period).production.oliveKg;
    expect(olive('month')).toBeGreaterThan(olive('week'));
  });

  it('marks the last bar of the chart as current', () => {
    const { bars } = dashboardMock(SITE_OUJDA_ID, 'month').oliveChart;
    expect(bars.map((bar) => bar.isCurrent)).toEqual([false, false, false, true]);
  });
});
