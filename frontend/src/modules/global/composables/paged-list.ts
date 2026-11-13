import { logDevError } from 'global/composables/with-status';
import { PAGE_SIZE } from 'global/constants/page';
import type { IPage, IPageQuery, IPagedList } from 'global/types/page';

type PageFetcher<T, Q> = (query: Q, page: IPageQuery) => Promise<IPage<T>>;

const isSameQuery = <Q>(first: Q | null, second: Q | null): boolean => JSON.stringify(first) === JSON.stringify(second);

export const emptyPagedList = <T, Q>(): IPagedList<T, Q> => ({ items: [], total: 0, query: null, isLoading: false, isLoadingMore: false, hasError: false });

/** Loads the first page of a query, unless that query is already loaded; an answer to an older query is dropped. */
export const loadFirstPage = async <T, Q>(list: IPagedList<T, Q>, query: Q, fetch: PageFetcher<T, Q>, isForced = false): Promise<void> => {
  if (!isForced && isSameQuery(list.query, query) && !list.hasError) return;
  list.query = query;
  list.isLoading = true;
  list.hasError = false;
  try {
    const page = await fetch(query, { offset: 0, limit: Math.max(PAGE_SIZE, isForced ? list.items.length : 0) });
    if (!isSameQuery(list.query, query)) return;
    list.items = page.items;
    list.total = page.total;
  } catch (error) {
    logDevError(error);
    if (isSameQuery(list.query, query)) list.hasError = true;
  } finally {
    if (isSameQuery(list.query, query)) list.isLoading = false;
  }
};

/** Adds the next page after the rows already shown. */
export const loadNextPage = async <T, Q>(list: IPagedList<T, Q>, fetch: PageFetcher<T, Q>): Promise<void> => {
  const query = list.query;
  if (!query || list.isLoadingMore || list.items.length >= list.total) return;
  list.isLoadingMore = true;
  try {
    const page = await fetch(query, { offset: list.items.length, limit: PAGE_SIZE });
    if (!isSameQuery(list.query, query)) return;
    list.items = [...list.items, ...page.items];
    list.total = page.total;
  } catch (error) {
    logDevError(error);
  } finally {
    list.isLoadingMore = false;
  }
};

/** Puts a changed record in place wherever the list already shows it. */
export const replaceInList = <T extends { id: string }, Q>(list: IPagedList<T, Q>, updated: T): void => {
  const index = list.items.findIndex((item) => item.id === updated.id);
  if (index !== -1) list.items.splice(index, 1, updated);
};
