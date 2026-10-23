import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'global/constants/mock-sites';
import { CLIENTS_MOCK } from 'global/constants/mock-clients';
import type { ILot, ISiteReceptionSettings, IWeighing } from 'reception/types/reception';

const todayAt = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

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
  announcedContainers: null,
  plate: '',
  origin: '',
  quality: [],
  note: '',
  dailyPricePerKg: null,
  finishedAt: null,
};

export const LOTS_MOCK: ILot[] = [
  {
    ...baseLot,
    id: 'l0a1b2c3-0001-4000-8000-000000000158',
    code: 'L-0158',
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
    code: 'L-0157',
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
    code: 'B-0087',
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

export const LAST_LOT_NUMBER_MOCK: Record<string, { prefix: string; number: number }> = {
  [SITE_OUJDA_ID]: { prefix: 'L', number: 158 },
  [SITE_BERKANE_ID]: { prefix: 'B', number: 87 },
};

export const SETTINGS_MOCK: Record<string, ISiteReceptionSettings> = {
  [SITE_OUJDA_ID]: { containerTareKg: { sac: 0.6, caisse: 2 }, dailyPricePerKg: 7.2 },
  [SITE_BERKANE_ID]: { containerTareKg: { sac: 0.6, caisse: 2 }, dailyPricePerKg: null },
};
