import { amountDue } from 'lot/composables/fee';
import type { ILot } from 'lot/types/lot';

/** What a Client owes and has waiting for confirmation, over the Lots given. */
export const clientMoney = (lots: readonly ILot[], clientId: string): { dueDh: number; pendingDh: number } => {
  const own = lots.filter((lot) => lot.clientId === clientId);
  return { dueDh: own.reduce((sum, lot) => sum + amountDue(lot), 0), pendingDh: own.reduce((sum, lot) => sum + lot.pendingDh, 0) };
};
