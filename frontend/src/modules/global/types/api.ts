import type { Method } from 'axios';

export interface IAPICallConfig {
  method: Method;
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}
