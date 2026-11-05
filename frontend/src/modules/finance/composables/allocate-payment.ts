import { amountDue } from 'lot/composables/fee';
import type { ILot } from 'lot/types/lot';
import type { ILotPaymentLink } from 'finance/types/finance';

const toCentimes = (amount: number): number => Math.round(amount * 100) / 100;

/** Spreads a Payment over the ticked Lots, oldest first: the last one it reaches may be only partly paid. */
export const allocatePayment = (lots: readonly ILot[], amount: number): ILotPaymentLink[] => {
  const links: ILotPaymentLink[] = [];
  let left = toCentimes(amount);
  [...lots]
    .sort((first, second) => first.receivedAt.localeCompare(second.receivedAt))
    .forEach((lot) => {
      const part = Math.min(amountDue(lot), left);
      if (part <= 0) return;
      links.push({ lotId: lot.id, lotCode: lot.code, amount: part });
      left = toCentimes(left - part);
    });
  return links;
};
