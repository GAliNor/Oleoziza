// PROTOTYPE — the Site's Lots for the Management Opérations page (ticket 0036), Service Milling only, until the Operations data model exists.
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { LOT_STATUSES, OIL_DENSITY, createLots, type LotStatus } from 'dashboard/prototype/mock-home.prototype';

export interface IStepPrototype {
  key: string;
  status: LotStatus | 'weighing' | 'stored';
  label: string;
  detail: string;
  at: string;
  by: string;
}

export interface ILotRecordPrototype {
  id: string;
  code: string;
  siteId: string;
  client: string;
  variety: string;
  status: LotStatus;
  netKg: number;
  oilKg: number | null;
  receivedAt: string;
  operator: string;
  tank: string | null;
  withdrawnKg: number;
  steps: IStepPrototype[];
}

export const TODAY = '2026-10-24';

export const VARIETIES = ['Picholine marocaine', 'Haouzia', 'Menara', 'Arbequina', 'Dahbia'];

export const MILLING_RATE = 0.5;

export const moneyOf = (lot: ILotRecordPrototype): { label: string; amount: number } => ({
  label: `Trituration · ${MILLING_RATE.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH/kg`,
  amount: lot.netKg * MILLING_RATE,
});

export const buildSteps = (lot: Omit<ILotRecordPrototype, 'steps'>): IStepPrototype[] => {
  const day = lot.receivedAt.slice(0, 10);
  const at = (time: string): string => `${day}T${time}:00+01:00`;
  const order = LOT_STATUSES.indexOf(lot.status);
  const steps: IStepPrototype[] = [
    { key: 'reception', status: 'received', label: 'Réception', detail: `${lot.client} · ${lot.variety}`, at: lot.receivedAt, by: lot.operator },
    { key: 'weighing', status: 'weighing', label: 'Pesées', detail: `${lot.netKg.toLocaleString('fr-FR')} kg net (${(lot.netKg / 100).toLocaleString('fr-FR')} q)`, at: lot.receivedAt, by: lot.operator },
  ];
  if (order >= 1) steps.push({ key: 'waiting', status: 'waiting', label: 'Réception terminée', detail: 'En file de pressage', at: at('09:40'), by: lot.operator });
  if (order >= 2) steps.push({ key: 'pressing', status: 'pressing', label: 'Pressage lancé', detail: 'Ligne 1', at: at('11:15'), by: 'Abdelkader Mansouri' });
  if (order >= 3 && lot.oilKg) {
    steps.push({
      key: 'pressed',
      status: 'pressed',
      label: 'Pressé',
      detail: `${lot.oilKg.toLocaleString('fr-FR')} kg d’huile · rendement ${((lot.oilKg / lot.netKg) * 100).toFixed(1).replace('.', ',')} %`,
      at: at('12:30'),
      by: 'Abdelkader Mansouri',
    });
    if (lot.tank) steps.push({ key: 'stored', status: 'stored', label: 'Versé en cuve', detail: lot.tank, at: at('12:45'), by: 'Abdelkader Mansouri' });
  }
  if (order >= 4 && lot.oilKg) {
    steps.push({ key: 'withdrawn', status: 'withdrawn', label: 'Retrait', detail: `${Math.round(lot.withdrawnKg / OIL_DENSITY)} L · bidons de 20 L`, at: at('16:05'), by: 'Hamid Zerrouki' });
  }
  return steps;
};

const FULL_NAMES: Record<string, string> = { Hamid: 'Hamid Zerrouki', Rachid: 'Rachid Bennani', Abdelkader: 'Abdelkader Mansouri' };

const TODAY_LOTS: Omit<ILotRecordPrototype, 'steps'>[] = createLots().map((lot) => ({
  id: lot.code,
  code: lot.code,
  siteId: lot.siteId,
  client: lot.client,
  variety: lot.variety,
  status: lot.status,
  netKg: lot.netKg,
  oilKg: lot.oilKg,
  receivedAt: `${TODAY}T${lot.receivedAt}:00+01:00`,
  operator: FULL_NAMES[lot.operator] ?? lot.operator,
  tank: lot.oilKg ? (lot.siteId === SITE_OUJDA_ID ? 'Cuve A2' : 'Cuve B1') : null,
  withdrawnKg: lot.status === 'withdrawn' ? (lot.oilKg ?? 0) : 0,
}));

const OLDER_CLIENTS = ['Jamal Ouazzani', 'Malika Tazi', 'Abdelhak Bouhaddou', 'Coopérative Ain Sfa', 'Omar Chergui', 'Brahim Lamrani', 'Aicha Zerrouki', 'Domaine Beni Snassen', 'Fouzia Belkadi', 'Zakaria Bensaid', 'Karim Mansouri', 'Noureddine Haddouchi'];

const OLDER_LOTS: Omit<ILotRecordPrototype, 'steps'>[] = Array.from({ length: 22 }, (_, index) => {
  const siteId = index % 3 === 2 ? SITE_BERKANE_ID : SITE_OUJDA_ID;
  const netKg = 700 + ((index * 787) % 3400);
  const yieldRate = 0.15 + ((index * 7) % 9) / 100;
  const status: LotStatus = index < 4 ? 'pressed' : 'withdrawn';
  const oilKg = Math.round(netKg * yieldRate);
  const day = 23 - Math.floor(index / 2);
  return {
    id: `old-${index}`,
    code: siteId === SITE_OUJDA_ID ? `OJ-2627-${String(148 - index).padStart(4, '0')}` : `BK-2627-${String(83 - index).padStart(4, '0')}`,
    siteId,
    client: OLDER_CLIENTS[index % OLDER_CLIENTS.length],
    variety: VARIETIES[index % 4],
    status,
    netKg,
    oilKg,
    receivedAt: `2026-10-${String(day).padStart(2, '0')}T0${7 + (index % 3)}:${String(10 + index).padStart(2, '0')}:00+01:00`,
    operator: siteId === SITE_OUJDA_ID ? (index % 2 ? 'Imane Saidi' : 'Hamid Zerrouki') : 'Abdelkader Mansouri',
    tank: siteId === SITE_OUJDA_ID ? (index % 2 ? 'Cuve A1' : 'Cuve A2') : 'Cuve B1',
    withdrawnKg: status === 'withdrawn' ? oilKg : 0,
  };
});

export const createLotRecords = (): ILotRecordPrototype[] => [...TODAY_LOTS, ...OLDER_LOTS].map((lot) => ({ ...lot, steps: buildSteps(lot) }));
