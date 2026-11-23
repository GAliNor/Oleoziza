import BaseService, { isMockModule } from 'global/services/base';
import UserMockService from 'user/services/user.mock';
import type { LoginMethod } from 'auth/types/auth';
import type { Permission } from 'global/types/session';
import type { IContactCheck, IContactHolders, IStaffForm, IStaffProfile, IStaffSecret, IStaffUser, IUserService, StaffRole, StaffStatus } from 'user/types/user';

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

  updateStatus(id: string, status: Exclude<StaffStatus, 'invited'>): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/status`, data: { status } });
  }

  updateProfile(id: string, profile: IStaffProfile): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/profile`, data: profile });
  }

  updateRole(id: string, role: StaffRole): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/role`, data: { role } });
  }

  updateSecret(id: string, secret: IStaffSecret): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/secret`, data: secret });
  }

  updateOwnership(id: string, isOwner: boolean): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/ownership`, data: { isOwner } });
  }

  checkContacts(contact: IContactCheck): Promise<IContactHolders> {
    return this.request<IContactHolders>({ method: 'GET', url: `${this._BASE_API_URL}/contact-check`, params: { ...contact } });
  }

  sendInvitation(id: string): Promise<IStaffUser> {
    return this.request<IStaffUser>({ method: 'POST', url: `${this._BASE_API_URL}/${id}/invitation` });
  }

  resetCredential(id: string): Promise<void> {
    return this.request<void>({ method: 'POST', url: `${this._BASE_API_URL}/${id}/reset` });
  }
}

export default isMockModule('user') ? UserMockService : UserApiService;
