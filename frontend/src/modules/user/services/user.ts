import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import UserMockService from 'user/services/user.mock';
import type { LoginMethod } from 'auth/types/auth';
import type { Permission } from 'global/types/session';
import type { IStaffForm, IStaffUser, IUserService, StaffStatus } from 'user/types/user';

class UserApiService extends BaseService implements IUserService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/users';

  getAll(): Promise<IStaffUser[]> {
    return this.request<IStaffUser[]>({ method: 'GET', url: this._BASE_API_URL });
  }

  create(form: IStaffForm): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'POST', url: this._BASE_API_URL, data: form });
  }

  updateSitePermissions(id: string, siteId: string, permissions: Permission[] | null): Promise<IStaffUser> {
    const url = `${this._BASE_API_URL}/${id}/sites/${siteId}`;
    return permissions === null
      ? this.request<IStaffUser>({ method: 'DELETE', url })
      : this.request<IStaffUser>({ method: 'PUT', url, data: { permissions } });
  }

  updateLoginMethods(id: string, loginMethods: LoginMethod[]): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/login-methods`, data: { loginMethods } });
  }

  updateStatus(id: string, status: Exclude<StaffStatus, 'invited'>): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/status`, data: { status } });
  }

  sendInvitation(id: string): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'POST', url: `${this._BASE_API_URL}/${id}/invitation` });
  }

  resetCredential(id: string): Promise<void> {
    return this.request<void>({ method: 'POST', url: `${this._BASE_API_URL}/${id}/reset` });
  }
}

export default IS_MOCK_DATA_SOURCE ? UserMockService : UserApiService;
