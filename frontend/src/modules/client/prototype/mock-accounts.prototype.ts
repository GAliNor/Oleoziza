// PROTOTYPE — mock balances for the Client page (ticket 0026) until the Money and Stock data models exist.
export interface IAccountPrototype {
  oilStockKg: number;
  dueDh: number;
  pendingDh: number;
  payoutDh: number;
  history: { code: string; status: string; kg: number }[];
}

export const EMPTY_ACCOUNT: IAccountPrototype = { oilStockKg: 0, dueDh: 0, pendingDh: 0, payoutDh: 0, history: [] };

export const CLIENT_ACCOUNTS_PROTOTYPE: Record<string, IAccountPrototype> = {
  'Mohammed Benali': { oilStockKg: 0, dueDh: 920, pendingDh: 0, payoutDh: 0, history: [{ code: 'L-0121', status: 'Retiré', kg: 1260 }] },
  'Coopérative Angad': { oilStockKg: 0, dueDh: 0, pendingDh: 0, payoutDh: 18400, history: [{ code: 'L-0156', status: 'En attente', kg: 3210 }] },
  'Said Tahiri': { oilStockKg: 389, dueDh: 1025, pendingDh: 500, payoutDh: 0, history: [{ code: 'L-0152', status: 'Pressé', kg: 2050 }] },
  'Khadija Bouzidi': { oilStockKg: 0, dueDh: 560, pendingDh: 0, payoutDh: 0, history: [{ code: 'L-0154', status: 'En attente', kg: 1120 }] },
  'Hassan Ziani': { oilStockKg: 172, dueDh: 495, pendingDh: 0, payoutDh: 0, history: [{ code: 'B-0084', status: 'Pressé', kg: 990 }] },
};
