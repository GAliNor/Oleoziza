import axios from 'axios';

import BaseService, { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import UserMockService from 'user/services/user.mock';
import type { LoginMethod, Permission } from 'auth/types/auth';
import type { IStaffForm, IStaffUser, IUserService, StaffStatus } from 'user/types/user';

class UserApiService extends BaseService implements IUserService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/users';

  async getAll(): Promise<IStaffUser[]> {
    const config = this.getConfig({ method: 'GET', url: this._BASE_API_URL });
    const response = await axios<IStaffUser[]>(config);
    return response.data;
  }

  async create(form: IStaffForm): Promise<IStaffUser> {
    const config = this.getConfig({ method: 'POST', url: this._BASE_API_URL, data: form });
    const response = await axios<IStaffUser>(config);
    return response.data;
  }

  async updateSitePermissions(id: string, siteId: string, permissions: Permission[] | null): Promise<IStaffUser> {
    const url = `${this._BASE_API_URL}/${id}/sites/${siteId}`;
    const config = permissions === null ? this.getConfig({ method: 'DELETE', url }) : this.getConfig({ method: 'PUT', url, data: { permissions } });
    const response = await axios<IStaffUser>(config);
    return response.data;
  }

  async updateLoginMethods(id: string, loginMethods: LoginMethod[]): Promise<IStaffUser> {
    const config = this.getConfig({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/login-methods`, data: { loginMethods } });
    const response = await axios<IStaffUser>(config);
    return response.data;
  }

  async updateStatus(id: string, status: Exclude<StaffStatus, 'invited'>): Promise<IStaffUser> {
    const config = this.getConfig({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/status`, data: { status } });
    const response = await axios<IStaffUser>(config);
    return response.data;
  }

  async sendInvitation(id: string): Promise<IStaffUser> {
    const config = this.getConfig({ method: 'POST', url: `${this._BASE_API_URL}/${id}/invitation` });
    const response = await axios<IStaffUser>(config);
    return response.data;
  }

  async resetCredential(id: string): Promise<void> {
    const config = this.getConfig({ method: 'POST', url: `${this._BASE_API_URL}/${id}/reset` });
    await axios(config);
  }
}

export default IS_MOCK_DATA_SOURCE ? UserMockService : UserApiService;
