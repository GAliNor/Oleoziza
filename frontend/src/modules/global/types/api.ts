import type { Method } from 'axios';

export interface IAPICallConfig {
  method: Method;
  url: string;
  data?: unknown;
  params?: Record<string, unknown> | URLSearchParams;
  headers?: Record<string, string>;
  /** Cancels the request when a newer one replaces it. */
  signal?: AbortSignal;
}
