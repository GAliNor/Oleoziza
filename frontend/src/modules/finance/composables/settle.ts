import type { IMovement } from 'finance/types/finance';

const toCentimes = (amount: number): number => Math.round(amount * 100) / 100;

/** What a Payment holds beyond what its Lots owe: to settle as a Credit Note or a Refund when it is confirmed. */
export const surplusOf = (movement: Pick<IMovement, 'amount' | 'lotLinks'>): number =>
  Math.max(toCentimes(movement.amount - movement.lotLinks.reduce((sum, link) => sum + link.amount, 0)), 0);
