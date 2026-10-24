import type { LoginMethod, Permission, Role } from 'auth/types/auth';

export interface IMockUser {
  id: string;
  role: Role;
  clientId: string | null;
  title?: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  loginMethods: LoginMethod[];
  pin: string | null;
  password: string | null;
  mustChangeCredential: boolean;
  status: 'invited' | 'active' | 'disabled';
  isOwner: boolean;
  sites: Record<string, readonly Permission[]>;
  hint: string;
  lastLoginAt?: string | null;
  invitedAt?: string | null;
}

export interface IMockInvitation {
  token: string;
  userId: string;
  invitedBy: string;
}
