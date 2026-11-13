import { describe, expect, it } from 'vitest';

import { hasMore, slicePage } from 'global/composables/page';

describe('pages', () => {
  const rows = Array.from({ length: 23 }, (_, index) => index);

  it('cuts a page and tells the size of the whole list', () => {
    expect(slicePage(rows, { offset: 0, limit: 10 })).toEqual({ items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], total: 23 });
    expect(slicePage(rows, { offset: 20, limit: 10 })).toEqual({ items: [20, 21, 22], total: 23 });
  });

  it('knows when rows are left to load', () => {
    expect([hasMore(10, 23), hasMore(23, 23), hasMore(0, 0)]).toEqual([true, false, false]);
  });
});
