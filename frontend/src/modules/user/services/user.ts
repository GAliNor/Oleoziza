import BaseService, { isMockModule } from 'global/services/base';
import UserMockService from 'user/services/user.mock';
import type { LoginMethod } from 'auth/types/auth';
import type { Permission, UserTitle } from 'global/types/session';
import type { ILocation } from 'territory/types/territory';
import type { IStaffForm, IStaffUser, IUserService, StaffStatus } from 'user/types/user';

class UserApiService extends BaseService implements IUserService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/user';

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

  /** Not served by the backend yet: the route comes with the user location work. */
  updateLocation(id: string, location: ILocation | null): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/location`, data: { location } });
  }

  updateStatus(id: string, status: Exclude<StaffStatus, 'invited'>): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/status`, data: { status } });
  }

  updateTitle(id: string, title: UserTitle | null): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/title`, data: { title } });
  }

  sendInvitation(id: string): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'POST', url: `${this._BASE_API_URL}/${id}/invitation` });
  }

  resetCredential(id: string): Promise<void> {
    return this.request<void>({ method: 'POST', url: `${this._BASE_API_URL}/${id}/reset` });
  }
}

export default isMockModule('user') ? UserMockService : UserApiService;
