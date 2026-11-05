export type DiscountEntry = 'percent' | 'amount';

export interface IDiscountFigures {
  amountDh: number;
  percent: number;
  isOverLimit: boolean;
  isTooHigh: boolean;
}

const toCentimes = (amount: number): number => Math.round(amount * 100) / 100;

/** Turns what was typed, a % or a DH amount, into both; the limit is always checked in %. The Owner has no limit. */
export const readDiscount = (entry: DiscountEntry, typed: number, fee: number, limitPercent: number, isOwner: boolean): IDiscountFigures => {
  const amountDh = toCentimes(entry === 'percent' ? (fee * typed) / 100 : typed);
  const percent = fee > 0 ? toCentimes((amountDh / fee) * 100) : 0;
  return { amountDh, percent, isOverLimit: !isOwner && percent > limitPercent, isTooHigh: amountDh > fee };
};
