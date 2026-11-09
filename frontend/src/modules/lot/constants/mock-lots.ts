import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { shiftDate, todayIso } from 'global/composables/date';
import { LOT_STATUSES } from 'lot/constants/lot';
import { mockStepPhotos } from 'lot/constants/mock-step-photos';
import { boxesNeeded } from 'lot/composables/lot-boxes';
import { suggestPours, tankStates } from 'lot/composables/storage';
import { CONFIGURATIONS_MOCK } from 'configuration/constants/mock-configuration';
import type { ILot, ILotDiscount, ILotMoveRecord, ILotNotification, LotStatus, NotificationChoice, ReceptionMode } from 'lot/types/lot';

const MOCK_MILLING_RATE = 0.5;

const daysAgoAt = (daysAgo: number, time: string): string => `${shiftDate(todayIso(), -daysAgo)}T${time}:00+01:00`;

const todayAt = (time: string): string => daysAgoAt(0, time);

const FULL_NAMES: Record<string, string> = { Hamid: 'Hamid Zerrouki', Rachid: 'Rachid Bennani', Abdelkader: 'Abdelkader Mansouri', Imane: 'Imane Saidi' };

interface ISeedLot {
  code: string;
  siteId: string;
  client: string;
  variety: string;
  mode: ReceptionMode;
  status: LotStatus;
  netKg: number;
  oilLitres: number | null;
  receivedAt: string;
  operator: string;
  isPendingSync?: boolean;
  discount?: ILotDiscount;
  notificationChoice?: NotificationChoice;
  isContactMissing?: boolean;
  notifications?: ILotNotification[];
}

const MOVE_TIMES: Partial<Record<LotStatus, { time: string; by?: string }>> = {
  pressing: { time: '11:15', by: 'Abdelkader Mansouri' },
  pressed: { time: '12:30', by: 'Abdelkader Mansouri' },
  withdrawn: { time: '16:05', by: 'Hamid Zerrouki' },
};

const seedMoves = (seed: ISeedLot): ILotMoveRecord[] => {
  const day = seed.receivedAt.slice(0, 10);
  return LOT_STATUSES.slice(0, LOT_STATUSES.indexOf(seed.status) + 1).map((status) => {
    const moved = MOVE_TIMES[status];
    return {
      status,
      at: moved ? `${day}T${moved.time}:00+01:00` : seed.receivedAt,
      by: moved?.by ?? FULL_NAMES[seed.operator] ?? seed.operator,
    };
  });
};

const toLot = (seed: ISeedLot): ILot => ({
  dailyPricePerKg: null,
  millingRatePerKg: MOCK_MILLING_RATE,
  discount: seed.discount ?? null,
  notificationChoice: seed.notificationChoice ?? 'none',
  isContactMissing: seed.isContactMissing ?? false,
  notifications: seed.notifications ?? [],
  paidDh: 0,
  pendingDh: 0,
  creditDh: 0,
  id: `lot-${seed.code}`,
  code: seed.code,
  siteId: seed.siteId,
  clientId: CLIENTS_MOCK.find((client) => client.name === seed.client)?.id ?? '',
  clientName: seed.client,
  mode: seed.mode,
  variety: seed.variety,
  status: seed.status,
  netKg: seed.netKg,
  oilLitres: seed.oilLitres,
  withdrawnLitres: seed.status === 'withdrawn' ? (seed.oilLitres ?? 0) : 0,
  boxNumbers: [],
  pressLineId: null,
  plannedStartAt: null,
  storages: [],
  moves: seedMoves(seed),
  stepPhotos: mockStepPhotos(seed.code, ['reception', ...seedMoves(seed).map((move) => move.status), ...(seed.oilLitres ? (['stored'] as const) : [])]),
  receivedAt: seed.receivedAt,
  receivedBy: FULL_NAMES[seed.operator] ?? seed.operator,
  isPendingSync: seed.isPendingSync ?? false,
});

const TODAY_SEEDS: ISeedLot[] = [
  { code: 'OJ-2627-0158', siteId: SITE_OUJDA_ID, client: 'Mohammed Benali', variety: 'Picholine marocaine', mode: 'service', status: 'waiting', netKg: 1840, oilLitres: null, receivedAt: todayAt('10:45'), operator: 'Hamid', isPendingSync: true },
  { code: 'OJ-2627-0157', siteId: SITE_OUJDA_ID, client: 'Fatima Zahra El Idrissi', variety: 'Haouzia', mode: 'service', status: 'waiting', netKg: 620, oilLitres: null, receivedAt: todayAt('10:28'), operator: 'Rachid', discount: { amountDh: 62, percent: 20, state: 'refused', givenBy: 'Rachid Bennani', givenAt: todayAt('10:28'), decidedBy: 'Mohammed Taibi', decidedAt: todayAt('11:05'), refusalReason: 'Client déjà remisé cette saison' } },
  { code: 'BK-2627-0087', siteId: SITE_BERKANE_ID, client: 'Youssef Kaddouri', variety: 'Picholine marocaine', mode: 'service', status: 'waiting', netKg: 1410, oilLitres: null, receivedAt: todayAt('10:15'), operator: 'Abdelkader' },
  { code: 'OJ-2627-0156', siteId: SITE_OUJDA_ID, client: 'Coopérative Angad', variety: 'Picholine marocaine', mode: 'purchase', status: 'waiting', netKg: 3210, oilLitres: null, receivedAt: todayAt('09:18'), operator: 'Hamid' },
  { code: 'OJ-2627-0155', siteId: SITE_OUJDA_ID, client: 'Abdellah Moussaoui', variety: 'Menara', mode: 'service', status: 'waiting', netKg: 940, oilLitres: null, receivedAt: todayAt('08:55'), operator: 'Hamid', notificationChoice: 'sms', discount: { amountDh: 94, percent: 20, state: 'pending', givenBy: 'Hamid Zerrouki', givenAt: todayAt('08:55') } },
  { code: 'OJ-2627-0154', siteId: SITE_OUJDA_ID, client: 'Khadija Bouzidi', variety: 'Picholine marocaine', mode: 'service', status: 'waiting', netKg: 1120, oilLitres: null, receivedAt: todayAt('08:40'), operator: 'Rachid', notificationChoice: 'email', isContactMissing: true, discount: { amountDh: 56, percent: 10, state: 'applied', givenBy: 'Rachid Bennani', givenAt: todayAt('08:40') } },
  { code: 'OJ-2627-0153', siteId: SITE_OUJDA_ID, client: 'Mustapha Ouchen', variety: 'Haouzia', mode: 'service', status: 'pressing', netKg: 1560, oilLitres: null, receivedAt: todayAt('08:12'), operator: 'Hamid' },
  { code: 'OJ-2627-0152', siteId: SITE_OUJDA_ID, client: 'Said Tahiri', variety: 'Picholine marocaine', mode: 'service', status: 'pressed', netKg: 2050, oilLitres: 425, receivedAt: todayAt('07:45'), operator: 'Abdelkader', notificationChoice: 'sms', notifications: [{ event: 'pressed', channel: 'sms', at: todayAt('12:30'), isFailed: false }] },
  { code: 'OJ-2627-0151', siteId: SITE_OUJDA_ID, client: 'Naima Lahlou', variety: 'Menara', mode: 'service', status: 'pressed', netKg: 780, oilLitres: 154, receivedAt: todayAt('07:30'), operator: 'Hamid' },
  { code: 'OJ-2627-0149', siteId: SITE_OUJDA_ID, client: 'Driss Amrani', variety: 'Picholine marocaine', mode: 'service', status: 'withdrawn', netKg: 1300, oilLitres: 270, receivedAt: todayAt('07:05'), operator: 'Hamid' },
  { code: 'BK-2627-0086', siteId: SITE_BERKANE_ID, client: 'Latifa Berrada', variety: 'Arbequina', mode: 'service', status: 'waiting', netKg: 860, oilLitres: null, receivedAt: todayAt('09:05'), operator: 'Abdelkader', discount: { amountDh: 86, percent: 20, state: 'pending', givenBy: 'Abdelkader Mansouri', givenAt: todayAt('08:30') } },
  { code: 'BK-2627-0085', siteId: SITE_BERKANE_ID, client: 'Domaine Zegzel', variety: 'Picholine marocaine', mode: 'purchase', status: 'pressing', netKg: 4120, oilLitres: null, receivedAt: todayAt('08:00'), operator: 'Abdelkader' },
  { code: 'BK-2627-0084', siteId: SITE_BERKANE_ID, client: 'Hassan Ziani', variety: 'Haouzia', mode: 'service', status: 'pressed', netKg: 990, oilLitres: 188, receivedAt: todayAt('07:20'), operator: 'Abdelkader' },
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
    oilLitres: Math.round(netKg * (0.165 + ((index * 7) % 9) / 100)),
    receivedAt: daysAgoAt(1 + Math.floor(index / 2), `0${7 + (index % 3)}:${String(10 + index).padStart(2, '0')}`),
    operator: siteId === SITE_OUJDA_ID ? (index % 2 ? 'Imane' : 'Hamid') : 'Abdelkader',
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
    oilLitres: status === 'pressed' ? Math.round(netKg * (0.165 + (index % 5) / 100)) : null,
    receivedAt: daysAgoAt(daysAgo, `${String(7 + (index % 10)).padStart(2, '0')}:${String((index * 17) % 60).padStart(2, '0')}`),
    operator: index % 2 ? 'Abdelkader' : 'Hamid',
  };
});

/** Lots still holding olives fill their Site's Boxes in order, a gap every third Lot so the grid has holes; older Lots remember a Box they once used. */
const withBoxes = (lots: ILot[]): ILot[] => {
  const nextBox: Record<string, number> = {};
  const lotsPlaced: Record<string, number> = {};
  return lots.map((lot) => {
    const { boxCount, boxCapacityKg } = CONFIGURATIONS_MOCK[lot.siteId];
    const count = Math.max(1, boxesNeeded(lot.netKg, boxCapacityKg));
    if (lot.status !== 'waiting') {
      const first = Number(lot.code.slice(-4)) % (boxCount - count + 1);
      return { ...lot, boxNumbers: Array.from({ length: count }, (_, index) => first + index + 1) };
    }
    const start = nextBox[lot.siteId] ?? 1;
    const placed = lotsPlaced[lot.siteId] ?? 0;
    lotsPlaced[lot.siteId] = placed + 1;
    nextBox[lot.siteId] = start + count + (placed % 3 === 2 ? 2 : 0);
    return { ...lot, boxNumbers: Array.from({ length: count }, (_, index) => start + index).filter((box) => box <= boxCount) };
  });
};

const HOUR_MS = 3_600_000;

/** Each Site's Lots get a Press Line: the pressing ones one per Line, the waiting ones shared out in queue order an hour apart, the older ones round the Lines. */
const withSchedule = (lots: ILot[]): ILot[] => {
  const firstFreeHour = Math.ceil(Date.now() / HOUR_MS) * HOUR_MS;
  const cursors: Record<string, number> = {};
  const counters: Record<string, number> = {};
  const byQueue = [...lots].sort((first, second) => first.receivedAt.localeCompare(second.receivedAt));
  const scheduled = new Map<string, Pick<ILot, 'pressLineId' | 'plannedStartAt'>>();
  ['pressing', 'waiting', 'pressed', 'withdrawn'].forEach((status) => {
    byQueue
      .filter((lot) => lot.status === status)
      .forEach((lot) => {
        const lines = CONFIGURATIONS_MOCK[lot.siteId].pressLines;
        const index = counters[lot.siteId] ?? 0;
        counters[lot.siteId] = index + 1;
        const line = lines[index % lines.length];
        if (status !== 'waiting') {
          scheduled.set(lot.id, { pressLineId: line.id, plannedStartAt: lot.moves.find((move) => move.status === 'pressing')?.at ?? lot.receivedAt });
          return;
        }
        const at = Math.max(cursors[line.id] ?? firstFreeHour, firstFreeHour);
        cursors[line.id] = at + HOUR_MS;
        scheduled.set(lot.id, { pressLineId: line.id, plannedStartAt: new Date(at).toISOString() });
      });
    if (status === 'pressing') Object.keys(counters).forEach((siteId) => (counters[siteId] = 0));
  });
  return lots.map((lot) => ({ ...lot, ...scheduled.get(lot.id) }));
};

const HANDED_OVER_AT_ONCE = new Set(['OJ-2627-0149']);

/** Where a Lot stood in the Tanks at an instant: the Storages begun by then and not yet ended. */
const asAt = (lot: ILot, at: string): ILot => ({ ...lot, storages: lot.storages.filter((storage) => storage.from <= at && (!storage.endedAt || storage.endedAt > at)).map((storage) => ({ ...storage, endedAt: null })) });

/**
 * Pours each pressed Lot's oil into its Site's Tanks, in the order it was pressed, as the Operator would have:
 * every Lot still holding oil is stored; some withdrawn ones were stored a while, others handed over at once.
 */
const withStorages = (lots: ILot[]): ILot[] => {
  const placed: ILot[] = [];
  const pressedAt = (lot: ILot): string => lot.moves.find((move) => move.status === 'pressed')?.at ?? lot.receivedAt;
  const byPressing = lots.filter((lot) => lot.oilLitres && (lot.status === 'pressed' || lot.status === 'withdrawn')).sort((first, second) => pressedAt(first).localeCompare(pressedAt(second)));
  byPressing.forEach((lot, index) => {
    const at = pressedAt(lot);
    const withdrawnAt = lot.moves.find((move) => move.status === 'withdrawn')?.at ?? null;
    if (HANDED_OVER_AT_ONCE.has(lot.code) || (withdrawnAt && index % 2)) return;
    const states = tankStates(CONFIGURATIONS_MOCK[lot.siteId].tanks, placed.filter((other) => other.siteId === lot.siteId).map((other) => asAt(other, at)));
    const plannedUntil = withdrawnAt ? null : index % 7 === 0 ? shiftDate(at.slice(0, 10), 3) : index % 3 === 0 ? shiftDate(at.slice(0, 10), 30) : null;
    lot.storages = suggestPours(states, lot.variety, lot.oilLitres ?? 0).map((pour, part) => ({
      id: `storage-${lot.code}-${part + 1}`,
      tankId: pour.tankId,
      litres: pour.litres,
      withdrawnLitres: withdrawnAt ? pour.litres : 0,
      from: at,
      plannedUntil,
      endedAt: withdrawnAt,
      by: lot.moves.find((move) => move.status === 'pressed')?.by ?? lot.receivedBy,
    }));
    placed.push(lot);
  });
  return lots;
};

export const LOTS_MOCK: ILot[] = withStorages(withSchedule(withBoxes([...TODAY_SEEDS, ...RECENT_SEEDS, ...OLDER_SEEDS].map(toLot))));
