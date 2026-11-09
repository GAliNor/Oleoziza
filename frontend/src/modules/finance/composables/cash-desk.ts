import { amountDue, isDiscountPending } from 'lot/composables/fee';
import type { ILot } from 'lot/types/lot';

export interface IClientToCollect {
  clientId: string;
  clientName: string;
  dueDh: number;
  lotCount: number;
  lastActivityAt: string;
  hasPendingDiscount: boolean;
}

/** Groups by Client; a Lot whose Client is unknown here keeps its name apart rather than pooling with others. */
export const clientKeyOf = (lot: Pick<ILot, 'clientId' | 'clientName'>): string => lot.clientId || `name:${lot.clientName}`;

export const lastActivityOf = (lot: ILot): string => lot.moves.reduce((latest, move) => (move.at > latest ? move.at : latest), lot.receivedAt);

/** Clients with Milling Fees to pay (purchased olives owe none), the one whose Lot moved last first: they are the likeliest at the counter. */
export const clientsToCollect = (lots: readonly ILot[]): IClientToCollect[] => {
  const byClient = new Map<string, IClientToCollect>();
  lots
    .filter((lot) => lot.mode === 'service' && (amountDue(lot) > 0 || isDiscountPending(lot)))
    .forEach((lot) => {
      const row = byClient.get(clientKeyOf(lot)) ?? { clientId: lot.clientId, clientName: lot.clientName, dueDh: 0, lotCount: 0, lastActivityAt: '', hasPendingDiscount: false };
      row.dueDh = Math.round((row.dueDh + amountDue(lot)) * 100) / 100;
      row.lotCount += 1;
      row.hasPendingDiscount ||= isDiscountPending(lot);
      const activity = lastActivityOf(lot);
      if (activity > row.lastActivityAt) row.lastActivityAt = activity;
      byClient.set(clientKeyOf(lot), row);
    });
  return [...byClient.values()].sort((first, second) => second.lastActivityAt.localeCompare(first.lastActivityAt));
};
