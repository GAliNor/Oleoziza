import type { ActivityKind } from 'activity/types/activity';

/** Every kind the Journal tells; typed as a full record so a kind added to the type must be added here too. */
const KINDS: Record<ActivityKind, true> = {
  reception: true,
  scheduled: true,
  pressing: true,
  pressed: true,
  withdrawal: true,
  stored: true,
  rate_corrected: true,
  discount_given: true,
  discount_pending: true,
  discount_approved: true,
  discount_refused: true,
  payment_recorded: true,
  payment_confirmed: true,
  payment_rejected: true,
  payment_cancelled: true,
  refund_made: true,
  refund_confirmed: true,
  expense_recorded: true,
  expense_planned: true,
  expense_paid: true,
  expense_unpaid: true,
  expense_updated: true,
  expense_cancelled: true,
  expense_deleted: true,
  expense_recurrence_stopped: true,
  debt_contact: true,
  configuration: true,
};

export const ACTIVITY_KINDS = Object.keys(KINDS) as ActivityKind[];
