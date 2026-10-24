import type { LoginMethod, Permission, Role } from 'auth/types/auth';

export type StaffRole = Exclude<Role, 'client'>;

export type StaffStatus = 'invited' | 'active' | 'disabled';

export type UserFilter = 'all' | 'management' | 'operator' | 'invited' | 'disabled';

export type UserView = 'list' | 'teams';

export interface IStaffUser {
  id: string;
  role: StaffRole;
  isOwner: boolean;
  title?: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  loginMethods: LoginMethod[];
  status: StaffStatus;
  sites: Record<string, Permission[]>;
  lastLoginAt: string | null;
  invitedAt: string | null;
}

export interface IStaffForm {
  role: StaffRole;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  sites: Record<string, Permission[]>;
  isInvited: boolean;
  firstSecret: string | null;
}

export interface IPermissionGroup {
  key: string;
  permissions: Permission[];
}

export interface IUserService {
  getAll(): Promise<IStaffUser[]>;
  create(form: IStaffForm): Promise<IStaffUser>;
  updateSitePermissions(id: string, siteId: string, permissions: Permission[] | null): Promise<IStaffUser>;
  updateLoginMethods(id: string, loginMethods: LoginMethod[]): Promise<IStaffUser>;
  updateStatus(id: string, status: Exclude<StaffStatus, 'invited'>): Promise<IStaffUser>;
  sendInvitation(id: string): Promise<IStaffUser>;
  resetCredential(id: string): Promise<void>;
}

export interface IUserStore {
  users: IStaffUser[];
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
