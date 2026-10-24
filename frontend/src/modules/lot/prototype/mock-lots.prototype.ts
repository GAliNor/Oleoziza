// PROTOTYPE — the Site's Lots for the Management Opérations page (ticket 0036), until the Operations data model exists.
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'global/constants/mock-sites';
import { LOT_STATUSES, OIL_DENSITY, createLots, type LotStatus } from 'dashboard/prototype/mock-home.prototype';

export type CorrectableField = 'client' | 'mode' | 'variety' | 'netKg' | 'oilKg';

export interface ICorrectionPrototype {
  field: CorrectableField;
  from: string;
  to: string;
  by: string;
  at: string;
  reason: string;
}

export interface IStepPrototype {
  key: string;
  status: LotStatus | 'weighing' | 'stored';
  label: string;
  detail: string;
  at: string;
  by: string;
  field?: CorrectableField;
  isCorrected?: boolean;
  wasOffline?: boolean;
}

export type ReviewPrototype =
  | { kind: 'conflict'; field: CorrectableField; applied: { value: string; by: string; at: string }; other: { value: string; by: string; at: string } }
  | { kind: 'permission'; stepKey: string; by: string; at: string; detail: string };

export interface ILotRecordPrototype {
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
  tank: string | null;
  withdrawnKg: number;
  steps: IStepPrototype[];
  corrections: ICorrectionPrototype[];
  review: ReviewPrototype | null;
}

export const FIELD_LABELS: Record<CorrectableField, string> = {
  client: 'Client',
  mode: 'Type',
  variety: 'Variété',
  netKg: 'Poids net',
  oilKg: 'Huile obtenue',
};

export const VARIETIES = ['Picholine marocaine', 'Haouzia', 'Menara', 'Arbequina', 'Dahbia'];

export const MILLING_RATE = 0.5;
export const DAILY_PRICE = 4.2;

export const MODE_LABELS: Record<'service' | 'purchase', string> = { service: 'Trituration à façon', purchase: 'Achat' };

export const formatField = (lot: ILotRecordPrototype, field: CorrectableField): string => {
  if (field === 'mode') return MODE_LABELS[lot.mode];
  if (field === 'netKg') return `${lot.netKg.toLocaleString('fr-FR')} kg`;
  if (field === 'oilKg') return lot.oilKg === null ? '—' : `${lot.oilKg.toLocaleString('fr-FR')} kg`;
  return lot[field];
};

export const moneyOf = (lot: ILotRecordPrototype): { label: string; amount: number } =>
  lot.mode === 'service'
    ? { label: `Frais de trituration · ${MILLING_RATE.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH/kg`, amount: lot.netKg * MILLING_RATE }
    : { label: `Prix d’achat · ${DAILY_PRICE.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH/kg`, amount: lot.netKg * DAILY_PRICE };

export const buildSteps = (lot: Omit<ILotRecordPrototype, 'steps' | 'corrections' | 'review'>): IStepPrototype[] => {
  const day = lot.receivedAt.slice(0, 10);
  const at = (time: string): string => `${day}T${time}:00+01:00`;
  const order = LOT_STATUSES.indexOf(lot.status);
  const steps: IStepPrototype[] = [
    { key: 'reception', status: 'received', label: 'Réception', detail: `${lot.client} · ${lot.variety} · ${MODE_LABELS[lot.mode]}`, at: lot.receivedAt, by: lot.operator, field: 'client' },
    { key: 'weighing', status: 'weighing', label: 'Pesées', detail: `${lot.netKg.toLocaleString('fr-FR')} kg net (${(lot.netKg / 100).toLocaleString('fr-FR')} q)`, at: lot.receivedAt, by: lot.operator, field: 'netKg' },
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
      field: 'oilKg',
    });
    if (lot.tank) steps.push({ key: 'stored', status: 'stored', label: 'Versé en cuve', detail: lot.tank, at: at('12:45'), by: 'Abdelkader Mansouri' });
  }
  if (order >= 4 && lot.oilKg) {
    steps.push({ key: 'withdrawn', status: 'withdrawn', label: 'Retrait', detail: `${Math.round(lot.withdrawnKg / OIL_DENSITY)} L · bidons de 20 L`, at: at('16:05'), by: 'Hamid Zerrouki' });
  }
  return steps;
};

const FULL_NAMES: Record<string, string> = { Hamid: 'Hamid Zerrouki', Rachid: 'Rachid Bennani', Abdelkader: 'Abdelkader Mansouri' };

const TODAY_LOTS: Omit<ILotRecordPrototype, 'steps' | 'corrections' | 'review'>[] = createLots().map((lot) => ({
  id: lot.code,
  code: lot.code,
  siteId: lot.siteId,
  client: lot.client,
  variety: lot.variety,
  mode: lot.mode,
  status: lot.status,
  netKg: lot.netKg,
  oilKg: lot.oilKg,
  receivedAt: `2026-10-24T${lot.receivedAt}:00+01:00`,
  operator: FULL_NAMES[lot.operator] ?? lot.operator,
  tank: lot.oilKg ? (lot.siteId === SITE_OUJDA_ID ? 'Cuve A2' : 'Cuve B1') : null,
  withdrawnKg: lot.status === 'withdrawn' ? (lot.oilKg ?? 0) : 0,
}));

const OLDER_CLIENTS = ['Jamal Ouazzani', 'Malika Tazi', 'Abdelhak Bouhaddou', 'Coopérative Ain Sfa', 'Omar Chergui', 'Brahim Lamrani', 'Aicha Zerrouki', 'Domaine Beni Snassen', 'Fouzia Belkadi', 'Zakaria Bensaid', 'Karim Mansouri', 'Noureddine Haddouchi'];

const OLDER_LOTS: Omit<ILotRecordPrototype, 'steps' | 'corrections' | 'review'>[] = Array.from({ length: 22 }, (_, index) => {
  const siteId = index % 3 === 2 ? SITE_BERKANE_ID : SITE_OUJDA_ID;
  const netKg = 700 + ((index * 787) % 3400);
  const yieldRate = 0.15 + ((index * 7) % 9) / 100;
  const status: LotStatus = index < 4 ? 'pressed' : 'withdrawn';
  const oilKg = Math.round(netKg * yieldRate);
  const day = 23 - Math.floor(index / 2);
  return {
    id: `old-${index}`,
    code: siteId === SITE_OUJDA_ID ? `L-${String(148 - index).padStart(4, '0')}` : `B-${String(83 - index).padStart(4, '0')}`,
    siteId,
    client: OLDER_CLIENTS[index % OLDER_CLIENTS.length],
    variety: VARIETIES[index % 4],
    mode: index % 5 === 3 ? 'purchase' : 'service',
    status,
    netKg,
    oilKg,
    receivedAt: `2026-10-${String(day).padStart(2, '0')}T0${7 + (index % 3)}:${String(10 + index).padStart(2, '0')}:00+01:00`,
    operator: siteId === SITE_OUJDA_ID ? (index % 2 ? 'Imane Saidi' : 'Hamid Zerrouki') : 'Abdelkader Mansouri',
    tank: siteId === SITE_OUJDA_ID ? (index % 2 ? 'Cuve A1' : 'Cuve A2') : 'Cuve B1',
    withdrawnKg: status === 'withdrawn' ? oilKg : 0,
  };
});

export const createLotRecords = (): ILotRecordPrototype[] => {
  const lots = [...TODAY_LOTS, ...OLDER_LOTS].map((lot) => ({ ...lot, steps: buildSteps(lot), corrections: [] as ICorrectionPrototype[], review: null as ReviewPrototype | null }));
  const byCode = (code: string): ILotRecordPrototype => lots.find((lot) => lot.code === code)!;

  const conflicted = byCode('L-0155');
  conflicted.review = {
    kind: 'conflict',
    field: 'netKg',
    applied: { value: '940 kg', by: 'Hamid Zerrouki', at: '2026-10-24T09:02:00+01:00' },
    other: { value: '1 040 kg', by: 'Rachid Bennani', at: '2026-10-24T08:58:00+01:00' },
  };
  conflicted.steps.find((step) => step.key === 'weighing')!.wasOffline = true;

  const revoked = byCode('B-0085');
  revoked.review = { kind: 'permission', stepKey: 'pressing', by: 'Yassine Lahlou', at: '2026-10-24T08:40:00+01:00', detail: 'Pressage lancé hors ligne par un compte désactivé avant la synchronisation.' };
  const pressingStep = revoked.steps.find((step) => step.key === 'pressing')!;
  Object.assign(pressingStep, { by: 'Yassine Lahlou', wasOffline: true });

  const corrected = byCode('L-0152');
  corrected.corrections.push({ field: 'netKg', from: '2 150 kg', to: '2 050 kg', by: 'Hamid Zerrouki', at: '2026-10-24T08:05:00+01:00', reason: 'Tare des caisses oubliée sur la 2e pesée' });
  corrected.steps.find((step) => step.key === 'weighing')!.isCorrected = true;

  const recorrected = byCode('L-0146');
  if (recorrected) {
    recorrected.corrections.push({ field: 'mode', from: 'Trituration à façon', to: 'Achat', by: 'Nadia Boukili', at: '2026-10-22T18:20:00+01:00', reason: 'Le Client a finalement vendu ses olives' });
    recorrected.mode = 'purchase';
    recorrected.steps[0].isCorrected = true;
  }
  return lots;
};
