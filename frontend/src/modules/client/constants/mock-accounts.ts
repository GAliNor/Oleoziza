import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import type { IClientAccount } from 'client/types/client';

export const EMPTY_ACCOUNT: IClientAccount = { oilStockKg: 0, dueDh: 0, pendingDh: 0, payoutDh: 0, history: [] };

const ACCOUNTS_BY_CLIENT_NAME: Record<string, IClientAccount> = {
  'Mohammed Benali': { oilStockKg: 0, dueDh: 920, pendingDh: 0, payoutDh: 0, history: [{ code: 'OJ-2627-0121', status: 'withdrawn', kg: 1260 }] },
  'Coopérative Angad': { oilStockKg: 0, dueDh: 0, pendingDh: 0, payoutDh: 18400, history: [{ code: 'OJ-2627-0156', status: 'waiting', kg: 3210 }] },
  'Said Tahiri': { oilStockKg: 389, dueDh: 1025, pendingDh: 500, payoutDh: 0, history: [{ code: 'OJ-2627-0152', status: 'pressed', kg: 2050 }] },
  'Khadija Bouzidi': { oilStockKg: 0, dueDh: 560, pendingDh: 0, payoutDh: 0, history: [{ code: 'OJ-2627-0154', status: 'waiting', kg: 1120 }] },
  'Hassan Ziani': { oilStockKg: 172, dueDh: 495, pendingDh: 0, payoutDh: 0, history: [{ code: 'BK-2627-0084', status: 'pressed', kg: 990 }] },
};

export const ACCOUNTS_MOCK: Record<string, IClientAccount> = Object.fromEntries(
  CLIENTS_MOCK.filter((client) => client.name in ACCOUNTS_BY_CLIENT_NAME).map((client) => [client.id, ACCOUNTS_BY_CLIENT_NAME[client.name]]),
);
