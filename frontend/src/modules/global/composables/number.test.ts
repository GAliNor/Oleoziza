import { describe, expect, it } from 'vitest';

import { formatDelta } from 'global/composables/number';

describe('formatDelta', () => {
  it.each([
    [11.56, '+11,6 %'],
    [-3.2, '−3,2 %'],
    [0, '+0,0 %'],
  ])('shows %d as %s', (percent, expected) => {
    expect(formatDelta(percent).replace(/\s/g, ' ')).toBe(expected);
  });
});
