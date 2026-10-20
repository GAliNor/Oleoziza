import type { AxiosRequestConfig } from 'axios';

import type { IAPICallConfig } from 'global/types/api';

export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock';
export const IS_MOCK_DATA_SOURCE = DATA_SOURCE === 'mock';

export default class BaseService {
  protected getConfig({ method, url, data, params, headers }: IAPICallConfig): AxiosRequestConfig {
    return {
      method,
      url,
      data,
      params,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
  }
}
