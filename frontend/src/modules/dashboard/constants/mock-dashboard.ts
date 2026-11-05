import { MOCK_PERIOD_FACTORS } from 'global/constants/period';
import { ALL_SITES } from 'site/constants/site';
import { SITES_MOCK, SITE_BERKANE_ID, SITE_OUJDA_ID, mockSiteShare } from 'site/constants/mock-sites';
import type { IDashboard, IOliveBar, ISiteFigures, ITank, ITankStorage } from 'dashboard/types/dashboard';
import type { PeriodKey } from 'global/types/period';

const TANKS: ITank[] = [
  { id: 'A1', siteId: SITE_OUJDA_ID, name: 'Cuve A1', capacityLitres: 20000, fillLitres: 15100, variety: 'Picholine marocaine', isBio: true },
  { id: 'A2', siteId: SITE_OUJDA_ID, name: 'Cuve A2', capacityLitres: 20000, fillLitres: 8050, variety: 'Picholine marocaine', isBio: false },
  { id: 'A3', siteId: SITE_OUJDA_ID, name: 'Cuve A3', capacityLitres: 10000, fillLitres: 9200, variety: 'Menara', isBio: false },
  { id: 'B1', siteId: SITE_BERKANE_ID, name: 'Cuve B1', capacityLitres: 15000, fillLitres: 13800, variety: 'Picholine marocaine', isBio: false },
  { id: 'B2', siteId: SITE_BERKANE_ID, name: 'Cuve B2', capacityLitres: 15000, fillLitres: 2250, variety: 'Arbequina', isBio: false },
];

const siteNameOf = (siteId: string): string => SITES_MOCK.find((site) => site.id === siteId)?.name ?? '';

const SITE_FIGURES: (ISiteFigures & { receptionsToday: number })[] = [
  { siteId: SITE_OUJDA_ID, name: siteNameOf(SITE_OUJDA_ID), oliveKgToday: 13420, receptionsToday: 11, oilLitresToday: 1943, queue: 6, yieldPerQuintal: 20.1, revenueSeason: 412800, outstanding: 64300 },
  { siteId: SITE_BERKANE_ID, name: siteNameOf(SITE_BERKANE_ID), oliveKgToday: 7380, receptionsToday: 7, oilLitresToday: 1114, queue: 3, yieldPerQuintal: 19.2, revenueSeason: 268500, outstanding: 31900 },
];

const SEASON = { olivesKg: 612400, previousOlivesKg: 548900, oilLitres: 119869, previousOilLitres: 110590, yieldPerQuintal: 19.5, previousYieldPerQuintal: 20.2, receptions: 452, lotsPressed: 338, averageWaitHours: 5.4, previousAverageWaitHours: 7.1 };

const LAST_SEVEN_DAYS = [
  { day: 'mer.', oliveKg: 15200, oilLitres: 2959 },
  { day: 'jeu.', oliveKg: 18900, oilLitres: 3734 },
  { day: 'ven.', oliveKg: 11300, oilLitres: 2238 },
  { day: 'sam.', oliveKg: 22400, oilLitres: 4432 },
  { day: 'dim.', oliveKg: 9800, oilLitres: 1889 },
  { day: 'lun.', oliveKg: 19700, oilLitres: 3908 },
  { day: 'auj.', oliveKg: 20800, oilLitres: 3057 },
];

const SEASON_WEEKS = [
  { week: 'S1', oliveKg: 61800, oilLitres: 11900 },
  { week: 'S2', oliveKg: 88400, oilLitres: 17031 },
  { week: 'S3', oliveKg: 117300, oilLitres: 23035 },
  { week: 'S4', oliveKg: 129600, oilLitres: 25655 },
  { week: 'S5', oliveKg: 104900, oilLitres: 20415 },
  { week: 'S6', oliveKg: 110400, oilLitres: 21834 },
];

const VARIETY_FIGURES = [
  { variety: 'Picholine marocaine', olivesKg: 401200, oilLitres: 79803, lots: 214 },
  { variety: 'Haouzia', olivesKg: 98600, oilLitres: 18777, lots: 61 },
  { variety: 'Menara', olivesKg: 71300, oilLitres: 13755, lots: 44 },
  { variety: 'Arbequina', olivesKg: 41300, oilLitres: 7533, lots: 19 },
];

const MODE_SPLIT = { serviceKg: 438900, purchaseKg: 173500 };

const TANK_STORAGE: ITankStorage[] = [
  { tankId: 'A1', lotCode: 'OJ-2627-0118', client: 'Achat · Coopérative Angad', kind: 'mill', litres: 6200, startDay: -18, endDay: null },
  { tankId: 'A1', lotCode: 'OJ-2627-0131', client: 'Stock du moulin (achats)', kind: 'mill', litres: 5400, startDay: -11, endDay: null },
  { tankId: 'A1', lotCode: 'OJ-2627-0144', client: 'Stock du moulin (achats)', kind: 'mill', litres: 3500, startDay: -4, endDay: null },
  { tankId: 'A2', lotCode: 'OJ-2627-0109', client: 'Driss Amrani', kind: 'client', litres: 1800, startDay: -20, endDay: -9 },
  { tankId: 'A2', lotCode: 'OJ-2627-0127', client: 'Abdellah Moussaoui', kind: 'client', litres: 2900, startDay: -13, endDay: -2 },
  { tankId: 'A2', lotCode: 'OJ-2627-0139', client: 'Mohammed Benali', kind: 'client', litres: 450, startDay: -6, endDay: null },
  { tankId: 'A2', lotCode: 'OJ-2627-0152', client: 'Said Tahiri', kind: 'client', litres: 425, startDay: 0, endDay: null },
  { tankId: 'A3', lotCode: 'OJ-2627-0121', client: 'Naima Lahlou', kind: 'client', litres: 3100, startDay: -16, endDay: -1 },
  { tankId: 'A3', lotCode: 'OJ-2627-0136', client: 'Khadija Bouzidi', kind: 'client', litres: 2600, startDay: -8, endDay: null },
  { tankId: 'A3', lotCode: 'OJ-2627-0146', client: 'Fatima Zahra El Idrissi', kind: 'client', litres: 3500, startDay: -3, endDay: null },
  { tankId: 'B1', lotCode: 'BK-2627-0061', client: 'Achat · Domaine Zegzel', kind: 'mill', litres: 9800, startDay: -15, endDay: null },
  { tankId: 'B1', lotCode: 'BK-2627-0079', client: 'Latifa Berrada', kind: 'client', litres: 165, startDay: -5, endDay: null },
  { tankId: 'B2', lotCode: 'BK-2627-0072', client: 'Hassan Ziani', kind: 'client', litres: 188, startDay: -9, endDay: null },
  { tankId: 'B2', lotCode: 'BK-2627-0058', client: 'Youssef Kaddouri', kind: 'client', litres: 2080, startDay: -19, endDay: -7 },
];

const deltaPct = (current: number, previous: number): number => ((current - previous) / previous) * 100;

const productionOf = (sites: typeof SITE_FIGURES, period: PeriodKey, factor: number): IDashboard['production'] => {
  if (period !== 'today') {
    return { oliveKg: SEASON.olivesKg * factor, oilLitres: SEASON.oilLitres * factor, receptions: Math.round(SEASON.receptions * factor), yieldPerQuintal: period === 'previous' ? SEASON.previousYieldPerQuintal : SEASON.yieldPerQuintal };
  }
  const oliveKg = sites.reduce((sum, site) => sum + site.oliveKgToday, 0);
  return {
    oliveKg,
    oilLitres: sites.reduce((sum, site) => sum + site.oilLitresToday, 0),
    receptions: sites.reduce((sum, site) => sum + site.receptionsToday, 0),
    yieldPerQuintal: oliveKg ? sites.reduce((sum, site) => sum + site.yieldPerQuintal * site.oliveKgToday, 0) / oliveKg : 0,
  };
};

const oliveChartOf = (period: PeriodKey, scale: number): IDashboard['oliveChart'] => {
  if (period === 'today' || period === 'week') {
    const bars: IOliveBar[] = LAST_SEVEN_DAYS.map((day, index) => ({ label: day.day, oliveKg: day.oliveKg * scale, oilLitres: day.oilLitres * scale, isCurrent: index === LAST_SEVEN_DAYS.length - 1 }));
    return { titleKey: 'dashboard.management.oliveChart.days', bars };
  }
  const weeks = period === 'month' ? SEASON_WEEKS.slice(-4) : SEASON_WEEKS;
  const factor = period === 'previous' ? 1.62 * scale : scale;
  return {
    titleKey: period === 'month' ? 'dashboard.management.oliveChart.monthWeeks' : 'dashboard.management.oliveChart.seasonWeeks',
    bars: weeks.map((week, index) => ({ label: week.week, oliveKg: week.oliveKg * factor, oilLitres: week.oilLitres * factor, isCurrent: index === weeks.length - 1 })),
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
      oilLitres: SEASON.oilLitres * factor,
      yieldPerQuintal: SEASON.yieldPerQuintal,
      averageWaitHours: SEASON.averageWaitHours,
      lotsPressed: Math.round(SEASON.lotsPressed * factor),
      oliveDeltaPct: deltaPct(SEASON.olivesKg, SEASON.previousOlivesKg),
      oilDeltaPct: deltaPct(SEASON.oilLitres, SEASON.previousOilLitres),
      yieldDeltaPct: deltaPct(SEASON.yieldPerQuintal, SEASON.previousYieldPerQuintal),
      waitDeltaPct: deltaPct(SEASON.averageWaitHours, SEASON.previousAverageWaitHours),
    },
    modeSplit: { serviceKg: MODE_SPLIT.serviceKg * factor, purchaseKg: MODE_SPLIT.purchaseKg * factor },
    varieties: VARIETY_FIGURES.map((row) => ({ variety: row.variety, lots: Math.max(1, Math.round(row.lots * factor)), olivesKg: row.olivesKg * factor, oilLitres: row.oilLitres * factor })),
    oliveChart: oliveChartOf(period, scale),
    tanks,
    tankStorage: TANK_STORAGE.filter((entry) => tanks.some((tank) => tank.id === entry.tankId)),
    sites,
  };
};
