import { http } from '~/plugins/axios';
import { getAccessToken } from 'global/services/access-token';
import type { IAPICallConfig } from 'global/types/api';

export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock';
export const IS_MOCK_DATA_SOURCE = DATA_SOURCE === 'mock';

export default class BaseService {
  protected async request<T>({ method, url, data, params, headers }: IAPICallConfig): Promise<T> {
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
