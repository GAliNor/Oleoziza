import type { IPage, IPageQuery } from 'global/types/page';

/** A page cut from a full list, the way a paged endpoint answers; mock services use it. */
export const slicePage = <T>(rows: readonly T[], { offset, limit }: IPageQuery): IPage<T> => ({ items: rows.slice(offset, offset + limit), total: rows.length });

/** Whether rows are left to load after those already shown. */
export const hasMore = (shown: number, total: number): boolean => shown < total;
