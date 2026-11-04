import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { shiftDate, todayIso } from 'global/composables/date';
import type { ILot, IWeighing, LotStatus, ReceptionMode } from 'lot/types/lot';

const daysAgoAt = (daysAgo: number, time: string): string => `${shiftDate(todayIso(), -daysAgo)}T${time}:00+01:00`;

const todayAt = (time: string): string => daysAgoAt(0, time);

const netWeighing = (id: string, netKg: number, time: string, by: string, isPendingSync = false): IWeighing => ({
  id,
  kind: 'net',
  grossKg: null,
  containers: { sac: 0, caisse: 0 },
  netKg,
  source: 'scale',
  recordedAt: todayAt(time),
  recordedBy: by,
  isPendingSync,
});

const baseLot = {
  oilKg: null,
  tankName: null,
  withdrawnKg: 0,
  announcedContainers: null,
  plate: '',
  origin: '',
  quality: [],
  note: '',
  dailyPricePerKg: null,
  finishedAt: null,
};

const OPENED_LOTS: ILot[] = [
  {
    ...baseLot,
    id: 'l0a1b2c3-0001-4000-8000-000000000158',
    code: 'OJ-2627-0158',
    siteId: SITE_OUJDA_ID,
    clientId: CLIENTS_MOCK[0].id,
    clientName: CLIENTS_MOCK[0].name,
    mode: 'service',
    variety: 'Picholine marocaine',
    status: 'received',
    netKg: 1840,
    announcedContainers: 60,
    origin: 'Bni Drar',
    weighings: [
      netWeighing('w0a1b2c3-0001-4000-8000-000000000001', 920, '10:49', 'Hamid', true),
      netWeighing('w0a1b2c3-0001-4000-8000-000000000002', 920, '10:52', 'Hamid', true),
    ],
    receivedAt: todayAt('10:45'),
    receivedBy: 'Hamid',
    isPendingSync: true,
  },
  {
    ...baseLot,
    id: 'l0a1b2c3-0001-4000-8000-000000000157',
    code: 'OJ-2627-0157',
    siteId: SITE_OUJDA_ID,
    clientId: CLIENTS_MOCK[1].id,
    clientName: CLIENTS_MOCK[1].name,
    mode: 'service',
    variety: 'Haouzia',
    status: 'received',
    netKg: 620,
    weighings: [netWeighing('w0a1b2c3-0001-4000-8000-000000000003', 620, '10:31', 'Rachid')],
    receivedAt: todayAt('10:28'),
    receivedBy: 'Rachid',
    isPendingSync: false,
  },
  {
    ...baseLot,
    id: 'l0a1b2c3-0001-4000-8000-000000000087',
    code: 'BK-2627-0087',
    siteId: SITE_BERKANE_ID,
    clientId: CLIENTS_MOCK[7].id,
    clientName: CLIENTS_MOCK[7].name,
    mode: 'service',
    variety: 'Picholine marocaine',
    status: 'received',
    netKg: 1410,
    weighings: [netWeighing('w0a1b2c3-0001-4000-8000-000000000004', 1410, '10:20', 'Abdelkader')],
    receivedAt: todayAt('10:15'),
    receivedBy: 'Abdelkader',
    isPendingSync: false,
  },
];

const FULL_NAMES: Record<string, string> = { Hamid: 'Hamid Zerrouki', Rachid: 'Rachid Bennani', Abdelkader: 'Abdelkader Mansouri', Imane: 'Imane Saidi' };

interface ISeedLot {
  code: string;
  siteId: string;
  client: string;
  variety: string;
  mode: ReceptionMode;
  status: LotStatus;
  netKg: number;
  oilKg: number | null;
  receivedAt: string;
  operator: string;
  tankName?: string;
}

const defaultTank = (siteId: string): string => (siteId === SITE_OUJDA_ID ? 'Cuve A2' : 'Cuve B1');

const toLot = (seed: ISeedLot): ILot => ({
  ...baseLot,
  id: `lot-${seed.code}`,
  code: seed.code,
  siteId: seed.siteId,
  clientId: CLIENTS_MOCK.find((client) => client.name === seed.client)?.id ?? '',
  clientName: seed.client,
  mode: seed.mode,
  variety: seed.variety,
  status: seed.status,
  netKg: seed.netKg,
  oilKg: seed.oilKg,
  tankName: seed.oilKg ? (seed.tankName ?? defaultTank(seed.siteId)) : null,
  withdrawnKg: seed.status === 'withdrawn' ? (seed.oilKg ?? 0) : 0,
  weighings: [],
  receivedAt: seed.receivedAt,
  receivedBy: FULL_NAMES[seed.operator] ?? seed.operator,
  isPendingSync: false,
});

const TODAY_SEEDS: ISeedLot[] = [
  { code: 'OJ-2627-0156', siteId: SITE_OUJDA_ID, client: 'Coopérative Angad', variety: 'Picholine marocaine', mode: 'purchase', status: 'waiting', netKg: 3210, oilKg: null, receivedAt: todayAt('09:18'), operator: 'Hamid' },
  { code: 'OJ-2627-0155', siteId: SITE_OUJDA_ID, client: 'Abdellah Moussaoui', variety: 'Menara', mode: 'service', status: 'waiting', netKg: 940, oilKg: null, receivedAt: todayAt('08:55'), operator: 'Hamid' },
  { code: 'OJ-2627-0154', siteId: SITE_OUJDA_ID, client: 'Khadija Bouzidi', variety: 'Picholine marocaine', mode: 'service', status: 'waiting', netKg: 1120, oilKg: null, receivedAt: todayAt('08:40'), operator: 'Rachid' },
  { code: 'OJ-2627-0153', siteId: SITE_OUJDA_ID, client: 'Mustapha Ouchen', variety: 'Haouzia', mode: 'service', status: 'pressing', netKg: 1560, oilKg: null, receivedAt: todayAt('08:12'), operator: 'Hamid' },
  { code: 'OJ-2627-0152', siteId: SITE_OUJDA_ID, client: 'Said Tahiri', variety: 'Picholine marocaine', mode: 'service', status: 'pressed', netKg: 2050, oilKg: 389, receivedAt: todayAt('07:45'), operator: 'Abdelkader' },
  { code: 'OJ-2627-0151', siteId: SITE_OUJDA_ID, client: 'Naima Lahlou', variety: 'Menara', mode: 'service', status: 'pressed', netKg: 780, oilKg: 141, receivedAt: todayAt('07:30'), operator: 'Hamid' },
  { code: 'OJ-2627-0149', siteId: SITE_OUJDA_ID, client: 'Driss Amrani', variety: 'Picholine marocaine', mode: 'service', status: 'withdrawn', netKg: 1300, oilKg: 247, receivedAt: todayAt('07:05'), operator: 'Hamid' },
  { code: 'BK-2627-0086', siteId: SITE_BERKANE_ID, client: 'Latifa Berrada', variety: 'Arbequina', mode: 'service', status: 'waiting', netKg: 860, oilKg: null, receivedAt: todayAt('09:05'), operator: 'Abdelkader' },
  { code: 'BK-2627-0085', siteId: SITE_BERKANE_ID, client: 'Domaine Zegzel', variety: 'Picholine marocaine', mode: 'purchase', status: 'pressing', netKg: 4120, oilKg: null, receivedAt: todayAt('08:00'), operator: 'Abdelkader' },
  { code: 'BK-2627-0084', siteId: SITE_BERKANE_ID, client: 'Hassan Ziani', variety: 'Haouzia', mode: 'service', status: 'pressed', netKg: 990, oilKg: 172, receivedAt: todayAt('07:20'), operator: 'Abdelkader' },
];

const RECENT_CLIENTS = [
  'Jamal Ouazzani', 'Malika Tazi', 'Abdelhak Bouhaddou', 'Coopérative Ain Sfa', 'Omar Chergui', 'Brahim Lamrani', 'Aicha Zerrouki', 'Domaine Beni Snassen', 'Fouzia Belkadi', 'Zakaria Bensaid',
];
const RECENT_VARIETIES = ['Picholine marocaine', 'Haouzia', 'Menara', 'Arbequina'];

const RECENT_SEEDS: ISeedLot[] = Array.from({ length: 22 }, (_, index) => {
  const siteId = index % 3 === 2 ? SITE_BERKANE_ID : SITE_OUJDA_ID;
  const netKg = 700 + ((index * 787) % 3400);
  const status: LotStatus = index < 4 ? 'pressed' : 'withdrawn';
  return {
    code: siteId === SITE_OUJDA_ID ? `OJ-2627-${String(148 - index).padStart(4, '0')}` : `BK-2627-${String(83 - index).padStart(4, '0')}`,
    siteId,
    client: RECENT_CLIENTS[index % RECENT_CLIENTS.length],
    variety: RECENT_VARIETIES[index % 4],
    mode: 'service',
    status,
    netKg,
    oilKg: Math.round(netKg * (0.15 + ((index * 7) % 9) / 100)),
    receivedAt: daysAgoAt(1 + Math.floor(index / 2), `0${7 + (index % 3)}:${String(10 + index).padStart(2, '0')}`),
    operator: siteId === SITE_OUJDA_ID ? (index % 2 ? 'Imane' : 'Hamid') : 'Abdelkader',
    tankName: siteId === SITE_OUJDA_ID ? (index % 2 ? 'Cuve A1' : 'Cuve A2') : 'Cuve B1',
  };
});

const OLDER_CLIENTS = [
  'Abdellah Mansouri', 'Fatima Zahra Elidrissi', 'Coopérative Zegzel', 'Mustapha Kaddouri', 'Naima Belhaj', 'Yassine Amrani', 'Domaine Sidi Yahya', 'Rachid Ouali', 'Aicha Bennani', 'Driss Lahlou',
  'Karima Tazi', 'Omar Benjelloun', 'Huilerie Taourirt', 'Brahim Saidi', 'Zineb Chraibi', 'Mehdi Alaoui', 'Hafida Bouchta', 'Youssef Ghali', 'Latifa Hamdouchi', 'Coopérative Ahfir',
];
const OLDER_STATUSES: LotStatus[] = ['pressed', 'pressed', 'waiting', 'pressed', 'pressed', 'waiting'];

const OLDER_SEEDS: ISeedLot[] = Array.from({ length: 64 }, (_, index) => {
  const daysAgo = 1 + Math.floor(index / 4);
  const status = daysAgo > 3 ? 'pressed' : OLDER_STATUSES[index % OLDER_STATUSES.length];
  const netKg = 600 + ((index * 379) % 3400);
  const siteId = index % 3 === 2 ? SITE_BERKANE_ID : SITE_OUJDA_ID;
  return {
    code: siteId === SITE_BERKANE_ID ? `BK-2627-${String(61 - Math.floor(index / 3)).padStart(4, '0')}` : `OJ-2627-${String(100 - index).padStart(4, '0')}`,
    siteId,
    client: OLDER_CLIENTS[index % OLDER_CLIENTS.length],
    variety: index % 4 === 0 ? 'Haouzia' : 'Picholine marocaine',
    mode: index % 7 === 0 ? 'purchase' : 'service',
    status,
    netKg,
    oilKg: status === 'pressed' ? Math.round(netKg * (0.15 + (index % 5) / 100)) : null,
    receivedAt: daysAgoAt(daysAgo, `${String(7 + (index % 10)).padStart(2, '0')}:${String((index * 17) % 60).padStart(2, '0')}`),
    operator: index % 2 ? 'Abdelkader' : 'Hamid',
  };
});

export const LOTS_MOCK: ILot[] = [...OPENED_LOTS, ...[...TODAY_SEEDS, ...RECENT_SEEDS, ...OLDER_SEEDS].map(toLot)];
