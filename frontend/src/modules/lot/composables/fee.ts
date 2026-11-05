import type { ILot, PaymentState } from 'lot/types/lot';

const toCentimes = (amount: number): number => Math.round(amount * 100) / 100;

/** The Milling Fee before any Discount: the rate the Lot was received at, times its net weight. */
export const fullFee = (lot: Pick<ILot, 'netKg' | 'millingRatePerKg'>): number => toCentimes(lot.netKg * lot.millingRatePerKg);

const isDiscountInForce = (lot: Pick<ILot, 'discount'>): boolean => lot.discount?.state === 'applied' || lot.discount?.state === 'approved';

export const isDiscountPending = (lot: Pick<ILot, 'discount'>): boolean => lot.discount?.state === 'pending';

/** What the Client owes for this Lot: full price until a pending Discount is approved. */
export const millingFee = (lot: Pick<ILot, 'netKg' | 'millingRatePerKg' | 'discount'>): number =>
  toCentimes(fullFee(lot) - (isDiscountInForce(lot) ? (lot.discount?.amountDh ?? 0) : 0));

type LotMoney = Pick<ILot, 'netKg' | 'millingRatePerKg' | 'discount' | 'paidDh' | 'pendingDh'> & Partial<Pick<ILot, 'creditDh'>>;

const settledOf = (lot: LotMoney): number => lot.paidDh + (lot.creditDh ?? 0);

/** What is still to pay: the fee, less confirmed Payments and those waiting for confirmation. */
export const amountDue = (lot: LotMoney): number => Math.max(toCentimes(millingFee(lot) - settledOf(lot) - lot.pendingDh), 0);

/** Where the fee stands, from the Lot's linked Payments. A rejected or cancelled Payment no longer counts, which puts the Lot back. */
export const paymentStateOf = (lot: LotMoney): PaymentState => {
  const fee = millingFee(lot);
  if (settledOf(lot) >= fee) return 'paid';
  if (settledOf(lot) + lot.pendingDh >= fee) return 'to_confirm';
  return settledOf(lot) + lot.pendingDh > 0 ? 'partial' : 'unpaid';
};
