import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { http } from '~/plugins/axios';

import BaseService from 'global/services/base';
import { setAccessToken, setTokenRefresher } from 'global/services/access-token';

vi.mock('~/plugins/axios', () => ({
  http: vi.fn(),
  isHttpError: (error: { isAxiosError?: boolean }): boolean => error.isAxiosError === true,
}));

class TestService extends BaseService {
  get(): Promise<string> {
    return this.request<string>({ method: 'GET', url: '/lots' });
  }
}

const unauthorized = { isAxiosError: true, response: { status: 401 } };
const httpMock = vi.mocked(http as unknown as (config: { headers: Record<string, string> }) => Promise<{ data: string }>);

describe('BaseService.request', () => {
  beforeEach(() => {
    httpMock.mockReset();
    setAccessToken('old');
  });

  afterEach(() => {
    setAccessToken(null);
  });

  it('sends the current access token', async () => {
    httpMock.mockResolvedValue({ data: 'lots' });
    expect(await new TestService().get()).toBe('lots');
    expect(httpMock.mock.calls[0][0].headers.Authorization).toBe('Bearer old');
  });

  it('refreshes once on a 401 and retries with the new token', async () => {
    httpMock.mockRejectedValueOnce(unauthorized).mockResolvedValueOnce({ data: 'lots' });
    setTokenRefresher(async () => setAccessToken('new'));
    expect(await new TestService().get()).toBe('lots');
    expect(httpMock.mock.calls[1][0].headers.Authorization).toBe('Bearer new');
  });

  it('shares one refresh between calls that fail together', async () => {
    const refresher = vi.fn(async () => setAccessToken('new'));
    setTokenRefresher(refresher);
    httpMock.mockRejectedValueOnce(unauthorized).mockRejectedValueOnce(unauthorized).mockResolvedValue({ data: 'lots' });
    const service = new TestService();
    await Promise.all([service.get(), service.get()]);
    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it('gives up after one retry', async () => {
    httpMock.mockRejectedValue(unauthorized);
    setTokenRefresher(async () => undefined);
    await expect(new TestService().get()).rejects.toBe(unauthorized);
    expect(httpMock).toHaveBeenCalledTimes(2);
  });

  it('does not refresh without a token', async () => {
    setAccessToken(null);
    const refresher = vi.fn(async () => undefined);
    setTokenRefresher(refresher);
    httpMock.mockRejectedValue(unauthorized);
    await expect(new TestService().get()).rejects.toBe(unauthorized);
    expect(refresher).not.toHaveBeenCalled();
  });
});
