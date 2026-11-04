import { CLIENT_RECORDS_MOCK } from 'client/constants/mock-client-records';
import type { IClientAccount } from 'client/types/client';

export const EMPTY_ACCOUNT: IClientAccount = { oilStockKg: 0, dueDh: 0, pendingDh: 0, payoutDh: 0, history: [] };

const ACCOUNTS_BY_CLIENT_NAME: Record<string, IClientAccount> = {
  'Mohammed Benali': { oilStockKg: 412, dueDh: 920, pendingDh: 0, payoutDh: 0, history: [{ code: 'OJ-2627-0121', status: 'withdrawn', kg: 1260 }] },
  'Coopérative Angad': { oilStockKg: 0, dueDh: 12400, pendingDh: 0, payoutDh: 18400, history: [{ code: 'OJ-2627-0156', status: 'waiting', kg: 3210 }] },
  'Said Tahiri': { oilStockKg: 389, dueDh: 1025, pendingDh: 500, payoutDh: 0, history: [{ code: 'OJ-2627-0152', status: 'pressed', kg: 2050 }] },
  'Khadija Bouzidi': { oilStockKg: 0, dueDh: 560, pendingDh: 0, payoutDh: 0, history: [{ code: 'OJ-2627-0154', status: 'waiting', kg: 1120 }] },
  'Hassan Ziani': { oilStockKg: 172, dueDh: 495, pendingDh: 0, payoutDh: 0, history: [{ code: 'BK-2627-0084', status: 'pressed', kg: 990 }] },
};

/** Every Client on the records owes the same here as there; the named ones add their lots and purchases. */
export const ACCOUNTS_MOCK: Record<string, IClientAccount> = Object.fromEntries(
  CLIENT_RECORDS_MOCK.map((record) => [
    record.id,
    ACCOUNTS_BY_CLIENT_NAME[record.name] ?? { ...EMPTY_ACCOUNT, oilStockKg: record.oilStockKg, dueDh: record.balance },
  ]),
);
