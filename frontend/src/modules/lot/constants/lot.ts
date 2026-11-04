import type { LotStatus } from 'lot/types/lot';

export const LOT_CODE_PARAM_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

export const OIL_DENSITY = 0.916;

export const LOT_STATUSES: readonly LotStatus[] = ['received', 'waiting', 'pressing', 'pressed', 'withdrawn'];

export const LOT_MOVE_TONES: Record<LotStatus, string> = {
  received: 'bg-info-subtle text-fg-info',
  waiting: 'bg-accent-subtle text-fg-accent',
  pressing: 'bg-action text-fg-on-action',
  pressed: 'bg-selected text-fg-brand',
  withdrawn: 'bg-subtle text-fg-secondary-paragraph',
};

export const LOT_STATUS_TONES: Record<LotStatus, string> = {
  received: 'bg-info-subtle text-fg-info',
  waiting: 'bg-warning-subtle text-fg-warning',
  pressing: 'bg-warning-subtle text-fg-warning',
  pressed: 'bg-selected text-fg-brand',
  withdrawn: 'bg-emphasis text-fg-primary-paragraph',
};

export const MILLING_RATE = 0.5;

export const YIELD_EXPECTED_MIN = 12;

export const YIELD_EXPECTED_MAX = 24;
