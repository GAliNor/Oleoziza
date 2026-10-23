// PROTOTYPE — throwaway mock data for the Home prototypes (tickets 0018 and 0019). Not production code.
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'global/constants/mock-sites';

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
}

export interface ITankPrototype {
  id: string;
  siteId: string;
  name: string;
  capacityKg: number;
  fillKg: number;
  isBio: boolean;
}

export interface IFollowUpPrototype {
  client: string;
  note: string;
  state: 'active' | 'at-risk' | 'inactive';
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

export const OIL_DENSITY = 0.916;
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
      detail: `${Math.round(lot.netKg / weighings).toLocaleString('fr-FR')} kg net · bascule`,
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
      detail: `${lot.oilKg} kg d’huile · rendement ${((lot.oilKg / lot.netKg) * 100).toFixed(1)} %`,
      at: '12:30',
      by: 'Abdelkader',
    });
    steps.push({ kind: 'stored', label: 'Stocké', detail: 'Cuve A2', at: '12:45', by: 'Abdelkader' });
  }
  if (order >= 4 && lot.oilKg) {
    steps.push({
      kind: 'withdrawal',
      label: 'Retrait',
      detail: `${Math.round(lot.oilKg / OIL_DENSITY)} L · bidons 20 L`,
      at: '16:05',
      by: 'Hamid',
    });
  }
  return steps;
};

const RAW_LOTS: Omit<ILotPrototype, 'steps' | 'isMine' | 'id'>[] = [
  { code: 'L-0158', siteId: SITE_OUJDA_ID, client: 'Mohammed Benali', variety: 'Picholine marocaine', mode: 'service', status: 'received', netKg: 1840, oilKg: null, receivedAt: '10:52', operator: 'Hamid', isPendingSync: true },
  { code: 'L-0157', siteId: SITE_OUJDA_ID, client: 'Fatima Zahra El Idrissi', variety: 'Haouzia', mode: 'service', status: 'received', netKg: 620, oilKg: null, receivedAt: '10:31', operator: 'Rachid', isPendingSync: false },
  { code: 'L-0156', siteId: SITE_OUJDA_ID, client: 'Coopérative Angad', variety: 'Picholine marocaine', mode: 'purchase', status: 'waiting', netKg: 3210, oilKg: null, receivedAt: '09:18', operator: 'Hamid', isPendingSync: false },
  { code: 'L-0155', siteId: SITE_OUJDA_ID, client: 'Abdellah Moussaoui', variety: 'Menara', mode: 'service', status: 'waiting', netKg: 940, oilKg: null, receivedAt: '08:55', operator: 'Hamid', isPendingSync: false },
  { code: 'L-0154', siteId: SITE_OUJDA_ID, client: 'Khadija Bouzidi', variety: 'Picholine marocaine', mode: 'service', status: 'waiting', netKg: 1120, oilKg: null, receivedAt: '08:40', operator: 'Rachid', isPendingSync: false },
  { code: 'L-0153', siteId: SITE_OUJDA_ID, client: 'Mustapha Ouchen', variety: 'Haouzia', mode: 'service', status: 'pressing', netKg: 1560, oilKg: null, receivedAt: '08:12', operator: 'Hamid', isPendingSync: false },
  { code: 'L-0152', siteId: SITE_OUJDA_ID, client: 'Said Tahiri', variety: 'Picholine marocaine', mode: 'service', status: 'pressed', netKg: 2050, oilKg: 389, receivedAt: '07:45', operator: 'Abdelkader', isPendingSync: false },
  { code: 'L-0151', siteId: SITE_OUJDA_ID, client: 'Naima Lahlou', variety: 'Menara', mode: 'service', status: 'pressed', netKg: 780, oilKg: 141, receivedAt: '07:30', operator: 'Hamid', isPendingSync: false },
  { code: 'L-0149', siteId: SITE_OUJDA_ID, client: 'Driss Amrani', variety: 'Picholine marocaine', mode: 'service', status: 'withdrawn', netKg: 1300, oilKg: 247, receivedAt: '07:05', operator: 'Hamid', isPendingSync: false },
  { code: 'B-0087', siteId: SITE_BERKANE_ID, client: 'Youssef Kaddouri', variety: 'Picholine marocaine', mode: 'service', status: 'received', netKg: 1410, oilKg: null, receivedAt: '10:20', operator: 'Abdelkader', isPendingSync: false },
  { code: 'B-0086', siteId: SITE_BERKANE_ID, client: 'Latifa Berrada', variety: 'Arbequina', mode: 'service', status: 'waiting', netKg: 860, oilKg: null, receivedAt: '09:05', operator: 'Abdelkader', isPendingSync: false },
  { code: 'B-0085', siteId: SITE_BERKANE_ID, client: 'Domaine Zegzel', variety: 'Picholine marocaine', mode: 'purchase', status: 'pressing', netKg: 4120, oilKg: null, receivedAt: '08:00', operator: 'Abdelkader', isPendingSync: false },
  { code: 'B-0084', siteId: SITE_BERKANE_ID, client: 'Hassan Ziani', variety: 'Haouzia', mode: 'service', status: 'pressed', netKg: 990, oilKg: 172, receivedAt: '07:20', operator: 'Abdelkader', isPendingSync: false },
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
  { id: 'A1', siteId: SITE_OUJDA_ID, name: 'Cuve A1', capacityKg: 20000, fillKg: 15100, isBio: true },
  { id: 'A2', siteId: SITE_OUJDA_ID, name: 'Cuve A2', capacityKg: 20000, fillKg: 8050, isBio: false },
  { id: 'A3', siteId: SITE_OUJDA_ID, name: 'Cuve A3', capacityKg: 10000, fillKg: 9200, isBio: false },
  { id: 'B1', siteId: SITE_BERKANE_ID, name: 'Cuve B1', capacityKg: 15000, fillKg: 13800, isBio: false },
  { id: 'B2', siteId: SITE_BERKANE_ID, name: 'Cuve B2', capacityKg: 15000, fillKg: 2250, isBio: false },
];

export const FOLLOW_UPS: IFollowUpPrototype[] = [
  { client: 'Coopérative Angad', note: 'Solde de 18 400 DH depuis 21 jours', state: 'at-risk' },
  { client: 'Hassan Ziani', note: 'Huile pressée non retirée depuis 9 jours', state: 'at-risk' },
  { client: 'Mohammed Benali', note: 'Venu aujourd’hui · 3ᵉ apport de la saison', state: 'active' },
  { client: 'Rkia Hammouti', note: 'Pas venue depuis 3 semaines (12 t la saison dernière)', state: 'inactive' },
];

export const SITE_FIGURES: ISiteFiguresPrototype[] = [
  { siteId: SITE_OUJDA_ID, name: 'Huilerie Oujda', oliveKgToday: 13420, receptionsToday: 11, oilKgToday: 1780, queue: 6, yieldPct: 18.4, revenueSeason: 412800, outstanding: 64300 },
  { siteId: SITE_BERKANE_ID, name: 'Huilerie Berkane', oliveKgToday: 7380, receptionsToday: 7, oilKgToday: 1020, queue: 3, yieldPct: 17.6, revenueSeason: 268500, outstanding: 31900 },
];

export const SEASON = {
  name: 'Saison 2026-2027',
  dayOfSeason: 22,
  netResult: 186400,
  previousNetResult: 162900,
  breakdown: [
    { label: 'Trituration à façon', amount: 248600 },
    { label: 'Ventes d’huile', amount: 371200 },
    { label: 'Sous-produits (grignons)', amount: 61500 },
    { label: 'Achats d’olives', amount: -421300 },
    { label: 'Charges', amount: -73600 },
  ],
  olivesKg: 612400,
  previousOlivesKg: 548900,
  oilKg: 109800,
  previousOilKg: 101300,
  yieldPct: 17.9,
  previousYieldPct: 18.5,
};

export const ALERTS = {
  paymentsToConfirm: 7,
  amountToConfirm: 23850,
  amountToCollect: 96200,
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

export const formatKg = (value: number): string => `${Math.round(value).toLocaleString('fr-FR')} kg`;
export const formatLitres = (kg: number): string => `${Math.round(kg / OIL_DENSITY).toLocaleString('fr-FR')} L`;
export const formatDh = (value: number): string => `${value < 0 ? '−' : ''}${Math.abs(Math.round(value)).toLocaleString('fr-FR')} DH`;
export const formatDelta = (current: number, previous: number): string => {
  const delta = ((current - previous) / previous) * 100;
  return `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} %`;
};

export interface IClientPrototype {
  name: string;
  kind: 'individual' | 'company';
  siteId: string;
  seasonKg: number;
  lots: number;
  oilStockKg: number;
  balance: number;
  lastVisit: string;
  lastVisitDays: number;
  state: IFollowUpPrototype['state'];
}

export interface IPaymentPrototype {
  client: string;
  method: 'Espèces' | 'Virement' | 'Chèque';
  amount: number;
  at: string;
  by: string;
  hasProof: boolean;
}

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

export const WEEKLY_REVENUE = [
  { week: 'S1', amount: 38400 },
  { week: 'S2', amount: 61200 },
  { week: 'S3', amount: 84900 },
  { week: 'S4', amount: 97300 },
];

export const PAYMENTS_TO_CONFIRM: IPaymentPrototype[] = [
  { client: 'Mohammed Benali', method: 'Espèces', amount: 920, at: 'auj. 10:58', by: 'Hamid', hasProof: false },
  { client: 'Coopérative Angad', method: 'Virement', amount: 9500, at: 'auj. 09:40', by: 'Rachid', hasProof: true },
  { client: 'Said Tahiri', method: 'Chèque', amount: 1025, at: 'hier 17:12', by: 'Abdelkader', hasProof: true },
  { client: 'Naima Lahlou', method: 'Espèces', amount: 390, at: 'hier 16:30', by: 'Hamid', hasProof: false },
  { client: 'Domaine Zegzel', method: 'Virement', amount: 2616, at: 'hier 11:05', by: 'Abdelkader', hasProof: true },
];

export const CLIENTS: IClientPrototype[] = [
  { name: 'Coopérative Angad', kind: 'company', siteId: SITE_OUJDA_ID, seasonKg: 48200, lots: 12, oilStockKg: 0, balance: 18400, lastVisit: 'auj.', lastVisitDays: 0, state: 'at-risk' },
  { name: 'Domaine Zegzel', kind: 'company', siteId: SITE_BERKANE_ID, seasonKg: 36900, lots: 8, oilStockKg: 0, balance: 4120, lastVisit: 'auj.', lastVisitDays: 0, state: 'active' },
  { name: 'Mohammed Benali', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 5140, lots: 3, oilStockKg: 412, balance: 920, lastVisit: 'auj.', lastVisitDays: 0, state: 'active' },
  { name: 'Said Tahiri', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 4310, lots: 2, oilStockKg: 389, balance: 1025, lastVisit: 'auj.', lastVisitDays: 0, state: 'active' },
  { name: 'Hassan Ziani', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 2980, lots: 2, oilStockKg: 172, balance: 495, lastVisit: 'il y a 9 j', lastVisitDays: 9, state: 'at-risk' },
  { name: 'Khadija Bouzidi', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2240, lots: 2, oilStockKg: 0, balance: 0, lastVisit: 'auj.', lastVisitDays: 0, state: 'active' },
  { name: 'Latifa Berrada', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 1720, lots: 2, oilStockKg: 151, balance: 430, lastVisit: 'auj.', lastVisitDays: 0, state: 'active' },
  { name: 'Rkia Hammouti', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 1200, lots: 1, oilStockKg: 0, balance: 0, lastVisit: 'il y a 21 j', lastVisitDays: 21, state: 'inactive' },
];

export const TANK_STORAGE: ITankStoragePrototype[] = [
  { tankId: 'A1', lotCode: 'L-0118', client: 'Achat · Coopérative Angad', kind: 'mill', kg: 6200, startDay: -18, endDay: null },
  { tankId: 'A1', lotCode: 'L-0131', client: 'Stock du moulin (achats)', kind: 'mill', kg: 5400, startDay: -11, endDay: null },
  { tankId: 'A1', lotCode: 'L-0144', client: 'Stock du moulin (achats)', kind: 'mill', kg: 3500, startDay: -4, endDay: null },
  { tankId: 'A2', lotCode: 'L-0109', client: 'Driss Amrani', kind: 'client', kg: 1800, startDay: -20, endDay: -9 },
  { tankId: 'A2', lotCode: 'L-0127', client: 'Abdellah Moussaoui', kind: 'client', kg: 2900, startDay: -13, endDay: -2 },
  { tankId: 'A2', lotCode: 'L-0139', client: 'Mohammed Benali', kind: 'client', kg: 412, startDay: -6, endDay: null },
  { tankId: 'A2', lotCode: 'L-0152', client: 'Said Tahiri', kind: 'client', kg: 389, startDay: 0, endDay: null },
  { tankId: 'A3', lotCode: 'L-0121', client: 'Naima Lahlou', kind: 'client', kg: 3100, startDay: -16, endDay: -1 },
  { tankId: 'A3', lotCode: 'L-0136', client: 'Khadija Bouzidi', kind: 'client', kg: 2600, startDay: -8, endDay: null },
  { tankId: 'A3', lotCode: 'L-0146', client: 'Fatima Zahra El Idrissi', kind: 'client', kg: 3500, startDay: -3, endDay: null },
  { tankId: 'B1', lotCode: 'B-0061', client: 'Achat · Domaine Zegzel', kind: 'mill', kg: 9800, startDay: -15, endDay: null },
  { tankId: 'B1', lotCode: 'B-0079', client: 'Latifa Berrada', kind: 'client', kg: 151, startDay: -5, endDay: null },
  { tankId: 'B2', lotCode: 'B-0072', client: 'Hassan Ziani', kind: 'client', kg: 172, startDay: -9, endDay: null },
  { tankId: 'B2', lotCode: 'B-0058', client: 'Youssef Kaddouri', kind: 'client', kg: 2080, startDay: -19, endDay: -7 },
];

export const dayLabel = (offset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const SEASON_WEEKS = [
  { week: 'S1', oliveKg: 61800, oilKg: 10900 },
  { week: 'S2', oliveKg: 88400, oilKg: 15600 },
  { week: 'S3', oliveKg: 117300, oilKg: 21100 },
  { week: 'S4', oliveKg: 129600, oilKg: 23500 },
  { week: 'S5', oliveKg: 104900, oilKg: 18700 },
  { week: 'S6', oliveKg: 110400, oilKg: 20000 },
];

export const olivesBars = (periodKey: string, scale: number): { title: string; bars: { label: string; value: number; lines: string[] }[] } => {
  if (periodKey === 'today' || periodKey === 'week') {
    return {
      title: 'Olives reçues, 7 derniers jours',
      bars: LAST_SEVEN_DAYS.map((day) => ({
        label: day.day,
        value: day.oliveKg * scale,
        lines: [`${formatKg(day.oliveKg * scale)} d’olives`, `${formatKg(day.oilKg * scale)} d’huile`],
      })),
    };
  }
  const weeks = periodKey === 'month' ? SEASON_WEEKS.slice(-4) : SEASON_WEEKS;
  const factor = periodKey === 'previous' ? 1.62 * scale : scale;
  return {
    title: periodKey === 'month' ? 'Olives reçues, par semaine ce mois' : 'Olives reçues, par semaine de saison',
    bars: weeks.map((week) => ({
      label: week.week,
      value: week.oliveKg * factor,
      lines: [`${formatKg(week.oliveKg * factor)} d’olives`, `${formatKg(week.oilKg * factor)} d’huile`],
    })),
  };
};
