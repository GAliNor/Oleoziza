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

/** The fee the Lot would owe at another rate, its Discount in force kept in dirhams. */
export const rateFee = (lot: LotMoney, ratePerKg: number): number => Math.max(toCentimes(lot.netKg * ratePerKg - (isDiscountInForce(lot) ? (lot.discount?.amountDh ?? 0) : 0)), 0);

/** The lowest rate a correction may set: the full fee never below what is paid or waiting plus the Discount in force, nor below any Discount not refused. */
export const lowestRate = (lot: LotMoney): number => {
  if (lot.netKg <= 0) return 0;
  const discount = lot.discount && lot.discount.state !== 'refused' ? lot.discount.amountDh : 0;
  const floor = Math.max(settledOf(lot) + lot.pendingDh + (isDiscountInForce(lot) ? discount : 0), discount);
  return Math.ceil((floor / lot.netKg) * 100 - 1e-9) / 100;
};

/** A rate can be corrected on a Lot milled for its Client until the fee is fully paid. */
export const canCorrectRate = (lot: LotMoney & Pick<ILot, 'mode'>): boolean => lot.mode === 'service_milling' && !(settledOf(lot) + lot.pendingDh > 0 && amountDue(lot) === 0);
