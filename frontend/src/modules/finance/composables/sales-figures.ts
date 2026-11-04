import type { IMovement, ISalesFigures } from 'finance/types/finance';

/** The sales figures once « À confirmer » counts the Payments actually waiting; the rest of the CA is split around them. */
export const withPendingPayments = (base: ISalesFigures, movements: IMovement[]): ISalesFigures => {
  const pendingPayments = movements.filter((movement) => movement.kind === 'payment' && movement.status === 'pending');
  const pending = pendingPayments.reduce((sum, movement) => sum + movement.amount, 0);
  const outstanding = Math.min(base.outstanding, base.revenue - pending);
  return { revenue: base.revenue, pending, pendingCount: pendingPayments.length, outstanding, collected: base.revenue - pending - outstanding };
};
