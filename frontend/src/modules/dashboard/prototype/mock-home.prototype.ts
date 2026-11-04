// PROTOTYPE — throwaway mock data for the Home prototypes (tickets 0018 and 0019). Not production code.
import type { IChartBar, IChartSeries } from 'global/types/chart';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { formatKgRounded, formatLitres, formatOliveKg, formatOilKg, formatYield } from 'lot/composables/quantity';
import { formatShortDate, todayIso, shiftDate } from 'global/composables/date';
import { formatNumber } from 'global/composables/number';

export type LotStatus = 'received' | 'waiting' | 'pressing' | 'pressed' | 'withdrawn';

export interface ITimelineStep {
  kind: 'reception' | 'weighing' | 'waiting' | 'pressing' | 'pressed' | 'stored' | 'withdrawal';
  label: string;
  detail: string;
  at: string;
  by: string;
  isPendingSync?: boolean;
}

export interface ILotPrototype {
  id: string;
  code: string;
  siteId: string;
  client: string;
  variety: string;
  mode: 'service' | 'purchase';
  status: LotStatus;
  netKg: number;
  oilKg: number | null;
  receivedAt: string;
  operator: string;
  isMine: boolean;
  isPendingSync: boolean;
  steps: ITimelineStep[];
  daysAgo?: number;
}

export interface ITankPrototype {
  id: string;
  siteId: string;
  name: string;
  capacityKg: number;
  fillKg: number;
  variety: string;
  isBio: boolean;
}

export interface ISiteFiguresPrototype {
  siteId: string;
  name: string;
  oliveKgToday: number;
  receptionsToday: number;
  oilKgToday: number;
  queue: number;
  yieldPct: number;
  revenueSeason: number;
  outstanding: number;
}

export const LOT_STATUSES: LotStatus[] = ['received', 'waiting', 'pressing', 'pressed', 'withdrawn'];

export const STATUS_LABELS: Record<LotStatus, string> = {
  received: 'Reçu',
  waiting: 'En attente',
  pressing: 'En pressage',
  pressed: 'Pressé',
  withdrawn: 'Retiré',
};

export const NEXT_STEP_LABELS: Record<LotStatus, string | null> = {
  received: 'Peser',
  waiting: 'Lancer le pressage',
  pressing: 'Saisir l’huile',
  pressed: 'Enregistrer un retrait',
  withdrawn: null,
};

export const CURRENT_OPERATOR = 'Hamid';

const buildSteps = (lot: Omit<ILotPrototype, 'steps'>): ITimelineStep[] => {
  const weighings = lot.netKg > 1500 ? 2 : 1;
  const steps: ITimelineStep[] = [
    {
      kind: 'reception',
      label: 'Réception',
      detail: `${lot.variety} · ${lot.mode === 'service' ? 'Trituration à façon' : 'Achat'}`,
      at: lot.receivedAt,
      by: lot.operator,
      isPendingSync: lot.isPendingSync,
    },
  ];
  for (let index = 1; index <= weighings; index++) {
    steps.push({
      kind: 'weighing',
      label: `Pesée ${index}`,
      detail: `${formatKgRounded(lot.netKg / weighings)} net · bascule`,
      at: lot.receivedAt,
      by: lot.operator,
      isPendingSync: lot.isPendingSync,
    });
  }
  const order = LOT_STATUSES.indexOf(lot.status);
  if (order >= 1) steps.push({ kind: 'waiting', label: 'En attente', detail: 'File de pressage', at: '09:40', by: 'Abdelkader' });
  if (order >= 2) steps.push({ kind: 'pressing', label: 'Pressage lancé', detail: 'Ligne 1', at: '11:15', by: 'Abdelkader' });
  if (order >= 3 && lot.oilKg) {
    steps.push({
      kind: 'pressed',
      label: 'Pressé',
      detail: `${formatOilKg(lot.oilKg)} · rendement ${formatYield(lot.oilKg, lot.netKg)}`,
      at: '12:30',
      by: 'Abdelkader',
    });
    steps.push({ kind: 'stored', label: 'Stocké', detail: 'Cuve A2', at: '12:45', by: 'Abdelkader' });
  }
  if (order >= 4 && lot.oilKg) {
    steps.push({
      kind: 'withdrawal',
      label: 'Retrait',
      detail: `${formatLitres(lot.oilKg)} · bidons 20 L`,
      at: '16:05',
      by: 'Hamid',
    });
  }
  return steps;
};

const RAW_LOTS: Omit<ILotPrototype, 'steps' | 'isMine' | 'id'>[] = [
  { code: 'OJ-2627-0158', siteId: SITE_OUJDA_ID, client: 'Mohammed Benali', variety: 'Picholine marocaine', mode: 'service', status: 'received', netKg: 1840, oilKg: null, receivedAt: '10:52', operator: 'Hamid', isPendingSync: true },
  { code: 'OJ-2627-0157', siteId: SITE_OUJDA_ID, client: 'Fatima Zahra El Idrissi', variety: 'Haouzia', mode: 'service', status: 'received', netKg: 620, oilKg: null, receivedAt: '10:31', operator: 'Rachid', isPendingSync: false },
  { code: 'OJ-2627-0156', siteId: SITE_OUJDA_ID, client: 'Coopérative Angad', variety: 'Picholine marocaine', mode: 'purchase', status: 'waiting', netKg: 3210, oilKg: null, receivedAt: '09:18', operator: 'Hamid', isPendingSync: false },
  { code: 'OJ-2627-0155', siteId: SITE_OUJDA_ID, client: 'Abdellah Moussaoui', variety: 'Menara', mode: 'service', status: 'waiting', netKg: 940, oilKg: null, receivedAt: '08:55', operator: 'Hamid', isPendingSync: false },
  { code: 'OJ-2627-0154', siteId: SITE_OUJDA_ID, client: 'Khadija Bouzidi', variety: 'Picholine marocaine', mode: 'service', status: 'waiting', netKg: 1120, oilKg: null, receivedAt: '08:40', operator: 'Rachid', isPendingSync: false },
  { code: 'OJ-2627-0153', siteId: SITE_OUJDA_ID, client: 'Mustapha Ouchen', variety: 'Haouzia', mode: 'service', status: 'pressing', netKg: 1560, oilKg: null, receivedAt: '08:12', operator: 'Hamid', isPendingSync: false },
  { code: 'OJ-2627-0152', siteId: SITE_OUJDA_ID, client: 'Said Tahiri', variety: 'Picholine marocaine', mode: 'service', status: 'pressed', netKg: 2050, oilKg: 389, receivedAt: '07:45', operator: 'Abdelkader', isPendingSync: false },
  { code: 'OJ-2627-0151', siteId: SITE_OUJDA_ID, client: 'Naima Lahlou', variety: 'Menara', mode: 'service', status: 'pressed', netKg: 780, oilKg: 141, receivedAt: '07:30', operator: 'Hamid', isPendingSync: false },
  { code: 'OJ-2627-0149', siteId: SITE_OUJDA_ID, client: 'Driss Amrani', variety: 'Picholine marocaine', mode: 'service', status: 'withdrawn', netKg: 1300, oilKg: 247, receivedAt: '07:05', operator: 'Hamid', isPendingSync: false },
  { code: 'BK-2627-0087', siteId: SITE_BERKANE_ID, client: 'Youssef Kaddouri', variety: 'Picholine marocaine', mode: 'service', status: 'received', netKg: 1410, oilKg: null, receivedAt: '10:20', operator: 'Abdelkader', isPendingSync: false },
  { code: 'BK-2627-0086', siteId: SITE_BERKANE_ID, client: 'Latifa Berrada', variety: 'Arbequina', mode: 'service', status: 'waiting', netKg: 860, oilKg: null, receivedAt: '09:05', operator: 'Abdelkader', isPendingSync: false },
  { code: 'BK-2627-0085', siteId: SITE_BERKANE_ID, client: 'Domaine Zegzel', variety: 'Picholine marocaine', mode: 'purchase', status: 'pressing', netKg: 4120, oilKg: null, receivedAt: '08:00', operator: 'Abdelkader', isPendingSync: false },
  { code: 'BK-2627-0084', siteId: SITE_BERKANE_ID, client: 'Hassan Ziani', variety: 'Haouzia', mode: 'service', status: 'pressed', netKg: 990, oilKg: 172, receivedAt: '07:20', operator: 'Abdelkader', isPendingSync: false },
];

export const createLots = (): ILotPrototype[] =>
  RAW_LOTS.map((raw) => {
    const lot = { ...raw, id: raw.code, isMine: raw.operator === CURRENT_OPERATOR };
    return { ...lot, steps: buildSteps(lot) };
  });

export const advanceLot = (lot: ILotPrototype, oilKg?: number): void => {
  const next = LOT_STATUSES[LOT_STATUSES.indexOf(lot.status) + 1];
  if (!next) return;
  lot.status = next;
  if (oilKg) lot.oilKg = oilKg;
  lot.isPendingSync = true;
  lot.steps = buildSteps(lot).map((step, index, all) => (index === all.length - 1 ? { ...step, at: 'à l’instant', by: CURRENT_OPERATOR, isPendingSync: true } : step));
};

export const TANKS: ITankPrototype[] = [
  { id: 'A1', siteId: SITE_OUJDA_ID, name: 'Cuve A1', capacityKg: 20000, fillKg: 15100, variety: 'Picholine marocaine', isBio: true },
  { id: 'A2', siteId: SITE_OUJDA_ID, name: 'Cuve A2', capacityKg: 20000, fillKg: 8050, variety: 'Picholine marocaine', isBio: false },
  { id: 'A3', siteId: SITE_OUJDA_ID, name: 'Cuve A3', capacityKg: 10000, fillKg: 9200, variety: 'Menara', isBio: false },
  { id: 'B1', siteId: SITE_BERKANE_ID, name: 'Cuve B1', capacityKg: 15000, fillKg: 13800, variety: 'Picholine marocaine', isBio: false },
  { id: 'B2', siteId: SITE_BERKANE_ID, name: 'Cuve B2', capacityKg: 15000, fillKg: 2250, variety: 'Arbequina', isBio: false },
];

export const SITE_FIGURES: ISiteFiguresPrototype[] = [
  { siteId: SITE_OUJDA_ID, name: 'AMANA OLIVE D’ORIENT', oliveKgToday: 13420, receptionsToday: 11, oilKgToday: 1780, queue: 6, yieldPct: 18.4, revenueSeason: 412800, outstanding: 64300 },
  { siteId: SITE_BERKANE_ID, name: 'Huilerie Berkane', oliveKgToday: 7380, receptionsToday: 7, oilKgToday: 1020, queue: 3, yieldPct: 17.6, revenueSeason: 268500, outstanding: 31900 },
];

export const SEASON = {
  name: 'Saison 2026-2027',
  dayOfSeason: 22,
  olivesKg: 612400,
  previousOlivesKg: 548900,
  oilKg: 109800,
  previousOilKg: 101300,
  yieldPct: 17.9,
  previousYieldPct: 18.5,
};

export const LAST_SEVEN_DAYS = [
  { day: 'mer.', oliveKg: 15200, oilKg: 2710 },
  { day: 'jeu.', oliveKg: 18900, oilKg: 3420 },
  { day: 'ven.', oliveKg: 11300, oilKg: 2050 },
  { day: 'sam.', oliveKg: 22400, oilKg: 4060 },
  { day: 'dim.', oliveKg: 9800, oilKg: 1730 },
  { day: 'lun.', oliveKg: 19700, oilKg: 3580 },
  { day: 'auj.', oliveKg: 20800, oilKg: 2800 },
];

export const formatDelta = (current: number, previous: number): string => {
  const delta = ((current - previous) / previous) * 100;
  return `${delta >= 0 ? '+' : '−'}${formatNumber(Math.abs(delta), 1, 1)} %`;
};

export interface ITankStoragePrototype {
  tankId: string;
  lotCode: string;
  client: string;
  kind: 'client' | 'mill';
  kg: number;
  startDay: number;
  endDay: number | null;
}

export const VARIETY_FIGURES = [
  { variety: 'Picholine marocaine', olivesKg: 401200, oilKg: 73100, lots: 214 },
  { variety: 'Haouzia', olivesKg: 98600, oilKg: 17200, lots: 61 },
  { variety: 'Menara', olivesKg: 71300, oilKg: 12600, lots: 44 },
  { variety: 'Arbequina', olivesKg: 41300, oilKg: 6900, lots: 19 },
];

export const MODE_SPLIT = { serviceKg: 438900, purchaseKg: 173500 };

export const PRODUCTION_EXTRA = {
  lotsPressedSeason: 338,
  averageWaitHours: 5.4,
  previousAverageWaitHours: 7.1,
  lotsPressedToday: 9,
};

export const TANK_STORAGE: ITankStoragePrototype[] = [
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

export const dayLabel = (offset: number): string => formatShortDate(shiftDate(todayIso(), offset));

export const SEASON_WEEKS = [
  { week: 'S1', oliveKg: 61800, oilKg: 10900 },
  { week: 'S2', oliveKg: 88400, oilKg: 15600 },
  { week: 'S3', oliveKg: 117300, oilKg: 21100 },
  { week: 'S4', oliveKg: 129600, oilKg: 23500 },
  { week: 'S5', oliveKg: 104900, oilKg: 18700 },
  { week: 'S6', oliveKg: 110400, oilKg: 20000 },
];

export const OLIVE_SERIES: IChartSeries[] = [{ key: 'olives', colorClass: 'bg-primary-olive-light', hoverClass: 'bg-primary-olive-mid', currentClass: 'bg-primary-olive-dark' }];

export const olivesBars = (periodKey: string, scale: number): { title: string; bars: (IChartBar & { lines: string[] })[] } => {
  if (periodKey === 'today' || periodKey === 'week') {
    return {
      title: 'Olives reçues, 7 derniers jours',
      bars: LAST_SEVEN_DAYS.map((day, index) => ({
        isCurrent: index === LAST_SEVEN_DAYS.length - 1,
        label: day.day,
        values: { olives: day.oliveKg * scale },
        lines: [formatOliveKg(Math.round(day.oliveKg * scale)), formatOilKg(Math.round(day.oilKg * scale))],
      })),
    };
  }
  const weeks = periodKey === 'month' ? SEASON_WEEKS.slice(-4) : SEASON_WEEKS;
  const factor = periodKey === 'previous' ? 1.62 * scale : scale;
  return {
    title: periodKey === 'month' ? 'Olives reçues, par semaine ce mois' : 'Olives reçues, par semaine de saison',
    bars: weeks.map((week, index) => ({
      isCurrent: index === weeks.length - 1,
      label: week.week,
      values: { olives: week.oliveKg * factor },
      lines: [formatOliveKg(Math.round(week.oliveKg * factor)), formatOilKg(Math.round(week.oilKg * factor))],
    })),
  };
};
