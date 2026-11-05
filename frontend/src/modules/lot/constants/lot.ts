import type { LotStatus, PaymentState } from 'lot/types/lot';

export const LOT_STATUSES: readonly LotStatus[] = ['waiting', 'pressing', 'pressed', 'withdrawn'];

export const LOT_MOVE_TONES: Record<LotStatus, string> = {
  waiting: 'bg-accent-subtle text-fg-accent',
  pressing: 'bg-action text-fg-on-action',
  pressed: 'bg-selected text-fg-brand',
  withdrawn: 'bg-subtle text-fg-secondary-paragraph',
};

export const LOT_STATUS_TONES: Record<LotStatus, string> = {
  waiting: 'bg-warning-subtle text-fg-warning',
  pressing: 'bg-warning-subtle text-fg-warning',
  pressed: 'bg-selected text-fg-brand',
  withdrawn: 'bg-emphasis text-fg-primary-paragraph',
};

export const YIELD_EXPECTED_MIN = 13;

export const YIELD_EXPECTED_MAX = 26;

export const PAYMENT_STATE_TONES: Record<PaymentState, string> = {
  unpaid: 'bg-danger-subtle text-fg-danger',
  partial: 'bg-warning-subtle text-fg-warning',
  to_confirm: 'bg-info-subtle text-fg-info',
  paid: 'bg-success-subtle text-fg-success',
};
