import { http, isHttpError } from '~/plugins/axios';
import { getAccessToken, refreshAccessToken } from 'global/services/access-token';
import type { IAPICallConfig } from 'global/types/api';

export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock';
export const IS_MOCK_DATA_SOURCE = DATA_SOURCE === 'mock';

const isUnauthorized = (error: unknown): boolean => isHttpError(error) && error.response?.status === 401;

export default class BaseService {
  /** Sends with the current access token; on a 401 it refreshes once and retries once. */
  protected async request<T>(config: IAPICallConfig): Promise<T> {
    try {
      return await this.send<T>(config);
    } catch (error) {
      if (!isUnauthorized(error) || !getAccessToken()) throw error;
      await refreshAccessToken();
      return this.send<T>(config);
    }
  }

  /** Sends once, without refreshing: for the auth calls themselves. */
  protected async send<T>({ method, url, data, params, headers }: IAPICallConfig): Promise<T> {
    const accessToken = getAccessToken();
    const response = await http<T>({
      method,
      url,
      data,
      params,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    });
    return response.data;
  }
}
