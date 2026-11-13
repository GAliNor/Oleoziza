import { describe, expect, it } from 'vitest';

import { emptyPagedList, loadFirstPage, loadNextPage, replaceInList } from 'global/composables/paged-list';
import { slicePage } from 'global/composables/page';
import type { IPageQuery } from 'global/types/page';

const ROWS = Array.from({ length: 25 }, (_, index) => ({ id: `r${index}`, name: index % 2 ? 'odd' : 'even' }));
const fetch = async (query: { name: string }, page: IPageQuery) => slicePage(ROWS.filter((row) => row.name === query.name), page);

describe('paged lists', () => {
  it('loads a first page, then the next ones, until the list is complete', async () => {
    const list = emptyPagedList<(typeof ROWS)[number], { name: string }>();
    await loadFirstPage(list, { name: 'even' }, fetch);
    expect([list.items.length, list.total]).toEqual([10, 13]);
    await loadNextPage(list, fetch);
    await loadNextPage(list, fetch);
    await loadNextPage(list, fetch);
    expect(list.items.map((row) => row.id).at(-1)).toBe('r24');
    expect(list.items.length).toBe(13);
  });

  it('restarts from the first page when the query changes, and keeps what it shows on a forced reload', async () => {
    const list = emptyPagedList<(typeof ROWS)[number], { name: string }>();
    await loadFirstPage(list, { name: 'even' }, fetch);
    await loadNextPage(list, fetch);
    await loadFirstPage(list, { name: 'even' }, fetch, true);
    expect(list.items.length).toBe(13);
    await loadFirstPage(list, { name: 'odd' }, fetch);
    expect([list.items[0].id, list.items.length, list.total]).toEqual(['r1', 10, 12]);
  });

  it('drops the answer to a query replaced while it loaded', async () => {
    const list = emptyPagedList<(typeof ROWS)[number], { name: string }>();
    const first = loadFirstPage(list, { name: 'even' }, fetch);
    const second = loadFirstPage(list, { name: 'odd' }, fetch);
    await Promise.all([first, second]);
    expect(list.items.every((row) => row.name === 'odd')).toBe(true);
  });

  it('puts a changed record in place', async () => {
    const list = emptyPagedList<(typeof ROWS)[number], { name: string }>();
    await loadFirstPage(list, { name: 'even' }, fetch);
    replaceInList(list, { id: 'r2', name: 'changed' });
    expect(list.items[1].name).toBe('changed');
  });
});
