import type { MovementStatus, PaymentMethodKey } from 'finance/types/finance';
import type { Permission } from 'global/types/session';

/** Holding any of these shows amounts; without them a person sees a Lot's Payment State only, as an Operator does. */
export const AMOUNT_PERMISSIONS: readonly Permission[] = ['finance.view', 'payment.record', 'discount.give', 'debt.follow'];

export const MOVEMENT_STATUS_TONES: Record<MovementStatus, string> = {
  pending: 'bg-warning-subtle text-fg-warning',
  confirmed: 'bg-success-subtle text-fg-success',
  rejected: 'bg-danger-subtle text-fg-danger',
  cancelled: 'bg-emphasis text-fg-primary-paragraph',
};

export const PAYMENT_METHOD_COLORS: Record<PaymentMethodKey, string> = {
  cash: 'var(--color-primary-olive-dark)',
  cheque: 'var(--color-primary-olive-mid)',
  transfer: 'var(--color-accent-sand)',
  oil: 'var(--color-accent-rust)',
};
