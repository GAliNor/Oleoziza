import axios, { isAxiosError } from 'axios';

import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import AuthMockService from 'auth/services/auth.mock';
import type {
  CredentialKind,
  IAuthError,
  IAuthService,
  IInvitation,
  ILoginOptions,
  ILoginPayload,
  ILoginResult,
  IResetPayload,
  IResetRequest,
} from 'auth/types/auth';
import type { IAPICallConfig } from 'global/types/api';

class AuthApiService extends BaseService implements IAuthService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/auth';

  private async call<T>(config: Omit<IAPICallConfig, 'url'> & { path: string }): Promise<T> {
    try {
      const response = await axios<T>(this.getConfig({ ...config, url: this._BASE_API_URL + config.path }));
      return response.data;
    } catch (error) {
      const data = isAxiosError(error) ? error.response?.data : undefined;
      throw (data?.code ? data : { code: 'network' }) as IAuthError;
    }
  }

  getLoginOptions(identifier: string): Promise<ILoginOptions> {
    return this.call({ method: 'POST', path: '/login-options', data: { identifier } });
  }

  requestCode(identifier: string): Promise<void> {
    return this.call({ method: 'POST', path: '/codes', data: { identifier } });
  }

  login(payload: ILoginPayload): Promise<ILoginResult> {
    return this.call({ method: 'POST', path: '/login', data: payload });
  }

  async refresh(sid: string): Promise<string> {
    const { accessToken } = await this.call<{ accessToken: string }>({ method: 'POST', path: '/refresh', data: { sid } });
    return accessToken;
  }

  logout(sid: string): Promise<void> {
    return this.call({ method: 'POST', path: '/logout', data: { sid } });
  }

  changeCredential(kind: CredentialKind, secret: string): Promise<void> {
    return this.call({ method: 'PUT', path: '/credential', data: { kind, secret } });
  }

  skipCredentialChange(): Promise<void> {
    return this.call({ method: 'POST', path: '/credential/skip' });
  }

  getInvitation(token: string): Promise<IInvitation> {
    return this.call({ method: 'GET', path: `/invitations/${encodeURIComponent(token)}` });
  }

  acceptInvitation(token: string, secret: string): Promise<ILoginResult> {
    return this.call({ method: 'POST', path: `/invitations/${encodeURIComponent(token)}/accept`, data: { secret } });
  }

  requestReset(identifier: string): Promise<IResetRequest> {
    return this.call({ method: 'POST', path: '/resets', data: { identifier } });
  }

  resetCredential(payload: IResetPayload): Promise<void> {
    return this.call({ method: 'POST', path: '/resets/confirm', data: payload });
  }
}

export default IS_MOCK_DATA_SOURCE ? AuthMockService : AuthApiService;
