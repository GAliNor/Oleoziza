import type { IPage, IPageQuery } from 'global/types/page';

/** A page cut from a full list, the way a paged endpoint answers; mock services use it. */
export const slicePage = <T>(rows: readonly T[], { offset, limit }: IPageQuery): IPage<T> => ({ items: rows.slice(offset, offset + limit), total: rows.length });

/** Whether rows are left to load after those already shown. */
export const hasMore = (shown: number, total: number): boolean => shown < total;

/** The page numbers to show: all of them up to 7, otherwise the first, the last and the current with its neighbours, `null` marking a gap. */
export const pageWindow = (page: number, pageCount: number): (number | null)[] => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const start = Math.min(Math.max(page - 1, 2), pageCount - 3);
  const end = start + 2;
  return [1, ...(start > 2 ? [null] : []), start, start + 1, end, ...(end < pageCount - 1 ? [null] : []), pageCount];
};
