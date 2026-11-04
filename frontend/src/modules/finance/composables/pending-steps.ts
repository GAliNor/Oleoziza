import type { IMovement, IPendingSteps } from 'finance/types/finance';

/** Steps through what is left to confirm, oldest first, looping so a skipped movement can always be reached again. */
export const pendingSteps = (pending: IMovement[], open: IMovement | undefined): IPendingSteps => {
  const total = pending.length;
  const index = open ? pending.findIndex((movement) => movement.id === open.id) : -1;
  if (index < 0) {
    const next = pending.find((movement) => open && movement.recordedAt > open.recordedAt) ?? pending[0];
    return { position: null, total, previousId: null, nextId: next?.id ?? null };
  }
  if (total === 1) return { position: 1, total, previousId: null, nextId: null };
  return { position: index + 1, total, previousId: pending[(index - 1 + total) % total].id, nextId: pending[(index + 1) % total].id };
};
