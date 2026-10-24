import { decodeJwt } from 'jose';

import { mockReject, mockResolve } from 'global/services/mock';
import { getAccessToken } from 'global/services/access-token';
import { MOCK_INVITATIONS_DB, MOCK_USERS_DB } from 'auth/services/users.mock-db';
import type { LoginMethod, Permission } from 'auth/types/auth';
import type { IMockUser } from 'auth/types/mock-auth';
import type { IStaffForm, IStaffUser, IUserService, StaffStatus } from 'user/types/user';

const toStaffUser = (user: IMockUser): IStaffUser => ({
  id: user.id,
  role: user.role === 'management' ? 'management' : 'operator',
  isOwner: user.isOwner,
  title: user.title,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  email: user.email,
  loginMethods: [...user.loginMethods],
  status: user.status,
  sites: Object.fromEntries(Object.entries(user.sites).map(([siteId, permissions]) => [siteId, [...permissions]])),
  lastLoginAt: user.lastLoginAt ?? null,
  invitedAt: user.invitedAt ?? null,
});

const findEditable = (id: string): IMockUser | Error => {
  const user = MOCK_USERS_DB.find((candidate) => candidate.id === id && candidate.role !== 'client');
  if (!user) return new Error('user_not_found');
  if (user.isOwner) return new Error('owner_locked');
  return user;
};

const inviterName = (): string => {
  const token = getAccessToken();
  if (!token) return '';
  const claims = decodeJwt(token) as { firstName?: string; lastName?: string };
  return `${claims.firstName ?? ''} ${claims.lastName ?? ''}`.trim();
};

const invite = (user: IMockUser): void => {
  const token = crypto.randomUUID();
  MOCK_INVITATIONS_DB.push({ token, userId: user.id, invitedBy: inviterName() });
  user.invitedAt = new Date().toISOString();
  console.info(`[mock] Invitation: /invitation/${token}`);
};

export default class UserMockService implements IUserService {
  getAll(): Promise<IStaffUser[]> {
    return mockResolve(MOCK_USERS_DB.filter((user) => user.role !== 'client').map(toStaffUser));
  }

  create(form: IStaffForm): Promise<IStaffUser> {
    const identifiers = [form.phone, form.email].filter(Boolean);
    if (MOCK_USERS_DB.some((user) => identifiers.includes(user.phone) || identifiers.includes(user.email))) return mockReject(new Error('identifier_taken'));
    const isOperator = form.role === 'operator';
    const user: IMockUser = {
      id: crypto.randomUUID(),
      role: form.role,
      clientId: null,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      email: form.email,
      loginMethods: isOperator || !form.email ? ['phone_pin'] : ['email_password'],
      pin: !form.isInvited && (isOperator || !form.email) ? form.firstSecret : null,
      password: !form.isInvited && !isOperator && form.email ? form.firstSecret : null,
      mustChangeCredential: !form.isInvited,
      status: form.isInvited ? 'invited' : 'active',
      isOwner: false,
      sites: form.sites,
      hint: '',
      lastLoginAt: null,
      invitedAt: null,
    };
    if (form.isInvited) invite(user);
    MOCK_USERS_DB.push(user);
    return mockResolve(toStaffUser(user));
  }

  updateSitePermissions(id: string, siteId: string, permissions: Permission[] | null): Promise<IStaffUser> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    if (permissions === null) {
      if (Object.keys(user.sites).length <= 1) return mockReject(new Error('last_site'));
      const { [siteId]: _removed, ...sites } = user.sites;
      user.sites = sites;
    } else {
      user.sites = { ...user.sites, [siteId]: [...permissions] };
    }
    return mockResolve(toStaffUser(user));
  }

  updateLoginMethods(id: string, loginMethods: LoginMethod[]): Promise<IStaffUser> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    if (!loginMethods.length) return mockReject(new Error('last_login_method'));
    user.loginMethods = [...loginMethods];
    return mockResolve(toStaffUser(user));
  }

  updateStatus(id: string, status: Exclude<StaffStatus, 'invited'>): Promise<IStaffUser> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    user.status = status === 'active' && !user.lastLoginAt && user.invitedAt ? 'invited' : status;
    return mockResolve(toStaffUser(user));
  }

  sendInvitation(id: string): Promise<IStaffUser> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    invite(user);
    return mockResolve(toStaffUser(user));
  }

  resetCredential(id: string): Promise<void> {
    const user = findEditable(id);
    if (user instanceof Error) return mockReject(user);
    user.mustChangeCredential = true;
    console.info(`[mock] Reset link sent to ${user.email ?? user.phone}`);
    return mockResolve(undefined);
  }
}
