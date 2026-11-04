import { describe, expect, it } from 'vitest';

import { periodRange } from 'global/composables/use-period';

describe('periodRange', () => {
  const TODAY = '2026-11-04';

  it.each([
    ['today', '2026-11-04', '2026-11-04'],
    ['week', '2026-10-29', '2026-11-04'],
    ['month', '2026-11-01', '2026-11-04'],
    ['season', '2026-10-01', '2026-11-04'],
    ['previous', '2025-10-01', '2026-03-31'],
  ] as const)('%s runs from %s to %s', (key, from, to) => {
    expect(periodRange(key, TODAY)).toEqual({ from, to });
  });
});
