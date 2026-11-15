import { describe, expect, it } from 'vitest';

import { hasMore, pageWindow, slicePage } from 'global/composables/page';

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

describe('pageWindow', () => {
  it('shows every page up to seven', () => {
    expect(pageWindow(3, 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('keeps the first, the last and the neighbours of the current page, with gaps', () => {
    expect(pageWindow(1, 15)).toEqual([1, 2, 3, 4, null, 15]);
    expect(pageWindow(8, 15)).toEqual([1, null, 7, 8, 9, null, 15]);
    expect(pageWindow(15, 15)).toEqual([1, null, 12, 13, 14, 15]);
  });
});
