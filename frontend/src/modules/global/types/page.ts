/** Which slice of a list to read: lists load a first page, then more on demand. */
export interface IPageQuery {
  offset: number;
  limit: number;
}

/** One slice of a list, with the size of the whole list so the screen can say « 10 sur 47 ». */
export interface IPage<T> {
  items: T[];
  total: number;
}

/** A list a store loads a page at a time, with the query its pages answer. */
export interface IPagedList<T, Q> {
  items: T[];
  total: number;
  query: Q | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasError: boolean;
}
