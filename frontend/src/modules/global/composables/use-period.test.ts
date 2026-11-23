import { beforeEach, describe, expect, it } from 'vitest';

import { keepSeasonDates } from 'global/composables/season-dates';
import { periodRange } from 'global/composables/use-period';

describe('periodRange', () => {
  const TODAY = '2026-11-20';

  beforeEach(() => keepSeasonDates(['2025-11-01', '2026-11-03'], TODAY));

  it.each([
    ['today', '2026-11-20', '2026-11-20'],
    ['week', '2026-11-14', '2026-11-20'],
    ['month', '2026-11-01', '2026-11-20'],
    ['season', '2026-11-03', '2026-11-20'],
    ['previous', '2025-11-01', '2026-11-02'],
  ] as const)('%s runs from %s to %s', (key, from, to) => {
    expect(periodRange(key, TODAY)).toEqual({ from, to });
  });

  it('starts on 1 November while no Season is known', () => {
    keepSeasonDates([], '2026-06-15');
    expect([periodRange('season', '2026-06-15'), periodRange('previous', '2026-06-15')]).toEqual([
      { from: '2025-11-01', to: '2026-06-15' },
      { from: '2024-11-01', to: '2025-10-31' },
    ]);
  });
});
