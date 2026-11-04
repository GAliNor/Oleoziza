import { describe, expect, it } from 'vitest';

import { isInWindow } from 'dashboard/composables/use-tank-window';
import type { ITankStorage } from 'dashboard/types/dashboard';

const entry = (startDay: number, endDay: number | null): ITankStorage => ({ startDay, endDay }) as ITankStorage;

describe('isInWindow', () => {
  it('shows oil stored during the window', () => {
    expect(isInWindow(entry(-3, -1), -6, 3)).toBe(true);
  });

  it('shows oil still in the Tank, however long ago it came', () => {
    expect(isInWindow(entry(-40, null), -6, 3)).toBe(true);
  });

  it('hides oil withdrawn before the window, and oil not yet there', () => {
    expect([isInWindow(entry(-20, -10), -6, 3), isInWindow(entry(5, null), -6, 3)]).toEqual([false, false]);
  });
});
