import { describe, expect, it } from 'vitest';

import { pendingSteps } from 'finance/composables/pending-steps';
import type { IMovement } from 'finance/types/finance';

const movement = (id: string, recordedAt: string): IMovement => ({ id, recordedAt }) as IMovement;
const PENDING = [movement('a', '2026-11-01'), movement('b', '2026-11-02'), movement('c', '2026-11-03')];

describe('pendingSteps', () => {
  it('walks past the second movement instead of bouncing between the first two', () => {
    expect(pendingSteps(PENDING, PENDING[1])).toEqual({ position: 2, total: 3, previousId: 'a', nextId: 'c' });
  });

  it('loops at both ends', () => {
    expect(pendingSteps(PENDING, PENDING[0]).previousId).toBe('c');
    expect(pendingSteps(PENDING, PENDING[2]).nextId).toBe('a');
  });

  it('goes on to the following movement once the open one has been confirmed', () => {
    expect(pendingSteps(PENDING, movement('confirmed', '2026-11-02T12:00'))).toEqual({ position: null, total: 3, previousId: null, nextId: 'c' });
  });

  it('falls back to the oldest when nothing later is left', () => {
    expect(pendingSteps(PENDING, movement('confirmed', '2026-11-09')).nextId).toBe('a');
  });

  it('has nowhere to go when the open movement is the only one', () => {
    expect(pendingSteps([PENDING[0]], PENDING[0])).toEqual({ position: 1, total: 1, previousId: null, nextId: null });
  });

  it('has nothing to offer when all is confirmed', () => {
    expect(pendingSteps([], movement('confirmed', '2026-11-09'))).toEqual({ position: null, total: 0, previousId: null, nextId: null });
  });
});
