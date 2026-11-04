import type { MovementStatus, PaymentMethodKey } from 'finance/types/finance';

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
