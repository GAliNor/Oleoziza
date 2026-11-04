import { MOCK_PERIOD_FACTORS } from 'global/constants/period';
import { ALL_SITES } from 'site/constants/site';
import { SITES_MOCK, SITE_BERKANE_ID, SITE_OUJDA_ID, mockSiteShare } from 'site/constants/mock-sites';
import type { IDashboard, IOliveBar, ISiteFigures, ITank, ITankStorage } from 'dashboard/types/dashboard';
import type { PeriodKey } from 'global/types/period';

const TANKS: ITank[] = [
  { id: 'A1', siteId: SITE_OUJDA_ID, name: 'Cuve A1', capacityKg: 20000, fillKg: 15100, variety: 'Picholine marocaine', isBio: true },
  { id: 'A2', siteId: SITE_OUJDA_ID, name: 'Cuve A2', capacityKg: 20000, fillKg: 8050, variety: 'Picholine marocaine', isBio: false },
  { id: 'A3', siteId: SITE_OUJDA_ID, name: 'Cuve A3', capacityKg: 10000, fillKg: 9200, variety: 'Menara', isBio: false },
  { id: 'B1', siteId: SITE_BERKANE_ID, name: 'Cuve B1', capacityKg: 15000, fillKg: 13800, variety: 'Picholine marocaine', isBio: false },
  { id: 'B2', siteId: SITE_BERKANE_ID, name: 'Cuve B2', capacityKg: 15000, fillKg: 2250, variety: 'Arbequina', isBio: false },
];

const siteNameOf = (siteId: string): string => SITES_MOCK.find((site) => site.id === siteId)?.name ?? '';

const SITE_FIGURES: (ISiteFigures & { receptionsToday: number })[] = [
  { siteId: SITE_OUJDA_ID, name: siteNameOf(SITE_OUJDA_ID), oliveKgToday: 13420, receptionsToday: 11, oilKgToday: 1780, queue: 6, yieldPct: 18.4, revenueSeason: 412800, outstanding: 64300 },
  { siteId: SITE_BERKANE_ID, name: siteNameOf(SITE_BERKANE_ID), oliveKgToday: 7380, receptionsToday: 7, oilKgToday: 1020, queue: 3, yieldPct: 17.6, revenueSeason: 268500, outstanding: 31900 },
];

const SEASON = { olivesKg: 612400, previousOlivesKg: 548900, oilKg: 109800, previousOilKg: 101300, yieldPct: 17.9, previousYieldPct: 18.5, receptions: 452, lotsPressed: 338, averageWaitHours: 5.4, previousAverageWaitHours: 7.1 };

const LAST_SEVEN_DAYS = [
  { day: 'mer.', oliveKg: 15200, oilKg: 2710 },
  { day: 'jeu.', oliveKg: 18900, oilKg: 3420 },
  { day: 'ven.', oliveKg: 11300, oilKg: 2050 },
  { day: 'sam.', oliveKg: 22400, oilKg: 4060 },
  { day: 'dim.', oliveKg: 9800, oilKg: 1730 },
  { day: 'lun.', oliveKg: 19700, oilKg: 3580 },
  { day: 'auj.', oliveKg: 20800, oilKg: 2800 },
];

const SEASON_WEEKS = [
  { week: 'S1', oliveKg: 61800, oilKg: 10900 },
  { week: 'S2', oliveKg: 88400, oilKg: 15600 },
  { week: 'S3', oliveKg: 117300, oilKg: 21100 },
  { week: 'S4', oliveKg: 129600, oilKg: 23500 },
  { week: 'S5', oliveKg: 104900, oilKg: 18700 },
  { week: 'S6', oliveKg: 110400, oilKg: 20000 },
];

const VARIETY_FIGURES = [
  { variety: 'Picholine marocaine', olivesKg: 401200, oilKg: 73100, lots: 214 },
  { variety: 'Haouzia', olivesKg: 98600, oilKg: 17200, lots: 61 },
  { variety: 'Menara', olivesKg: 71300, oilKg: 12600, lots: 44 },
  { variety: 'Arbequina', olivesKg: 41300, oilKg: 6900, lots: 19 },
];

const MODE_SPLIT = { serviceKg: 438900, purchaseKg: 173500 };

const TANK_STORAGE: ITankStorage[] = [
  { tankId: 'A1', lotCode: 'OJ-2627-0118', client: 'Achat · Coopérative Angad', kind: 'mill', kg: 6200, startDay: -18, endDay: null },
  { tankId: 'A1', lotCode: 'OJ-2627-0131', client: 'Stock du moulin (achats)', kind: 'mill', kg: 5400, startDay: -11, endDay: null },
  { tankId: 'A1', lotCode: 'OJ-2627-0144', client: 'Stock du moulin (achats)', kind: 'mill', kg: 3500, startDay: -4, endDay: null },
  { tankId: 'A2', lotCode: 'OJ-2627-0109', client: 'Driss Amrani', kind: 'client', kg: 1800, startDay: -20, endDay: -9 },
  { tankId: 'A2', lotCode: 'OJ-2627-0127', client: 'Abdellah Moussaoui', kind: 'client', kg: 2900, startDay: -13, endDay: -2 },
  { tankId: 'A2', lotCode: 'OJ-2627-0139', client: 'Mohammed Benali', kind: 'client', kg: 412, startDay: -6, endDay: null },
  { tankId: 'A2', lotCode: 'OJ-2627-0152', client: 'Said Tahiri', kind: 'client', kg: 389, startDay: 0, endDay: null },
  { tankId: 'A3', lotCode: 'OJ-2627-0121', client: 'Naima Lahlou', kind: 'client', kg: 3100, startDay: -16, endDay: -1 },
  { tankId: 'A3', lotCode: 'OJ-2627-0136', client: 'Khadija Bouzidi', kind: 'client', kg: 2600, startDay: -8, endDay: null },
  { tankId: 'A3', lotCode: 'OJ-2627-0146', client: 'Fatima Zahra El Idrissi', kind: 'client', kg: 3500, startDay: -3, endDay: null },
  { tankId: 'B1', lotCode: 'BK-2627-0061', client: 'Achat · Domaine Zegzel', kind: 'mill', kg: 9800, startDay: -15, endDay: null },
  { tankId: 'B1', lotCode: 'BK-2627-0079', client: 'Latifa Berrada', kind: 'client', kg: 151, startDay: -5, endDay: null },
  { tankId: 'B2', lotCode: 'BK-2627-0072', client: 'Hassan Ziani', kind: 'client', kg: 172, startDay: -9, endDay: null },
  { tankId: 'B2', lotCode: 'BK-2627-0058', client: 'Youssef Kaddouri', kind: 'client', kg: 2080, startDay: -19, endDay: -7 },
];

const deltaPct = (current: number, previous: number): number => ((current - previous) / previous) * 100;

const productionOf = (sites: typeof SITE_FIGURES, period: PeriodKey, factor: number): IDashboard['production'] => {
  if (period !== 'today') {
    return { oliveKg: SEASON.olivesKg * factor, oilKg: SEASON.oilKg * factor, receptions: Math.round(SEASON.receptions * factor), yieldPct: period === 'previous' ? SEASON.previousYieldPct : SEASON.yieldPct };
  }
  const oliveKg = sites.reduce((sum, site) => sum + site.oliveKgToday, 0);
  return {
    oliveKg,
    oilKg: sites.reduce((sum, site) => sum + site.oilKgToday, 0),
    receptions: sites.reduce((sum, site) => sum + site.receptionsToday, 0),
    yieldPct: oliveKg ? sites.reduce((sum, site) => sum + site.yieldPct * site.oliveKgToday, 0) / oliveKg : 0,
  };
};

const oliveChartOf = (period: PeriodKey, scale: number): IDashboard['oliveChart'] => {
  if (period === 'today' || period === 'week') {
    const bars: IOliveBar[] = LAST_SEVEN_DAYS.map((day, index) => ({ label: day.day, oliveKg: day.oliveKg * scale, oilKg: day.oilKg * scale, isCurrent: index === LAST_SEVEN_DAYS.length - 1 }));
    return { titleKey: 'dashboard.management.oliveChart.days', bars };
  }
  const weeks = period === 'month' ? SEASON_WEEKS.slice(-4) : SEASON_WEEKS;
  const factor = period === 'previous' ? 1.62 * scale : scale;
  return {
    titleKey: period === 'month' ? 'dashboard.management.oliveChart.monthWeeks' : 'dashboard.management.oliveChart.seasonWeeks',
    bars: weeks.map((week, index) => ({ label: week.week, oliveKg: week.oliveKg * factor, oilKg: week.oilKg * factor, isCurrent: index === weeks.length - 1 })),
  };
};

export const dashboardMock = (siteId: string, period: PeriodKey): IDashboard => {
  const isAllSites = siteId === ALL_SITES;
  const scale = mockSiteShare(siteId);
  const factor = scale * MOCK_PERIOD_FACTORS[period];
  const sites = isAllSites ? SITE_FIGURES : SITE_FIGURES.filter((site) => site.siteId === siteId);
  const tanks = isAllSites ? TANKS : TANKS.filter((tank) => tank.siteId === siteId);
  return {
    production: productionOf(sites, period, factor),
    season: {
      oliveKg: SEASON.olivesKg * factor,
      oilKg: SEASON.oilKg * factor,
      yieldPct: SEASON.yieldPct,
      averageWaitHours: SEASON.averageWaitHours,
      lotsPressed: Math.round(SEASON.lotsPressed * factor),
      oliveDeltaPct: deltaPct(SEASON.olivesKg, SEASON.previousOlivesKg),
      oilDeltaPct: deltaPct(SEASON.oilKg, SEASON.previousOilKg),
      yieldDeltaPct: deltaPct(SEASON.yieldPct, SEASON.previousYieldPct),
      waitDeltaPct: deltaPct(SEASON.averageWaitHours, SEASON.previousAverageWaitHours),
    },
    modeSplit: { serviceKg: MODE_SPLIT.serviceKg * factor, purchaseKg: MODE_SPLIT.purchaseKg * factor },
    varieties: VARIETY_FIGURES.map((row) => ({ variety: row.variety, lots: Math.max(1, Math.round(row.lots * factor)), olivesKg: row.olivesKg * factor, oilKg: row.oilKg * factor })),
    oliveChart: oliveChartOf(period, scale),
    tanks,
    tankStorage: TANK_STORAGE.filter((entry) => tanks.some((tank) => tank.id === entry.tankId)),
    sites,
  };
};
