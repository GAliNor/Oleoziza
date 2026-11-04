import { describe, expect, it } from 'vitest';

import { fitWithin } from 'global/composables/image';

describe('fitWithin', () => {
  it('shrinks the longest side to the limit, keeping the proportions', () => {
    expect([fitWithin(4000, 3000, 1600), fitWithin(3000, 4000, 1600)]).toEqual([
      { width: 1600, height: 1200 },
      { width: 1200, height: 1600 },
    ]);
  });

  it('never enlarges a small image', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
