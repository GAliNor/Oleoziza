import type { Permission, Role } from 'global/types/session';

export type LoginMethod = 'phone_pin' | 'email_password' | 'phone_otp';

export type CredentialKind = 'pin' | 'password';


export type AuthErrorCode =
  | 'invalid_identifier'
  | 'unknown_identifier'
  | 'method_not_allowed'
  | 'invalid_credential'
  | 'invalid_code'
  | 'locked'
  | 'disabled'
  | 'invalid_invitation'
  | 'invalid_reset'
  | 'staff_reset'
  | 'session_expired'
  | 'network';

export interface IAuthError {
  code: AuthErrorCode;
  lockedUntil?: string;
}

export interface IAccessClaims {
  sub: string;
  sid: string;
  role: Role;
  isOwner: boolean;
  sites: Record<string, Permission[]>;
  title?: string;
  firstName: string;
  lastName: string;
  exp: number;
  iat?: number;
}

export interface ILoginOptions {
  identifier: string;
  loginMethods: LoginMethod[];
}

export interface ILoginPayload {
  identifier: string;
  method: LoginMethod;
  secret: string;
}

export interface ILoginResult {
  accessToken: string;
  mustChangeCredential: boolean;
  canSkipCredentialChange: boolean;
  credentialKind: CredentialKind | null;
  canOfferPin: boolean;
}

export interface IInvitation {
  firstName: string;
  lastName: string;
  invitedBy: string;
  credentialKind: CredentialKind;
  identifier: string;
}

export interface IResetRequest {
  channel: 'sms' | 'email';
  credentialKind: CredentialKind;
}

export interface IResetPayload {
  identifier?: string;
  code?: string;
  resetToken?: string;
  secret: string;
}

export interface IDeviceProfile {
  userId: string;
  firstName: string;
  lastName: string;
  pinHash: string;
  salt: string;
  accessToken: string;
}

export interface IAuthService {
  getLoginOptions(identifier: string): Promise<ILoginOptions>;
  requestCode(identifier: string): Promise<void>;
  login(payload: ILoginPayload): Promise<ILoginResult>;
  refresh(sid: string): Promise<string>;
  logout(sid: string): Promise<void>;
  changeCredential(kind: CredentialKind, secret: string): Promise<void>;
  skipCredentialChange(): Promise<void>;
  getInvitation(token: string): Promise<IInvitation>;
  acceptInvitation(token: string, secret: string): Promise<ILoginResult>;
  requestReset(identifier: string): Promise<IResetRequest>;
  resetCredential(payload: IResetPayload): Promise<void>;
}

export interface IAuthStore {
  accessToken: string | null;
  mustChangeCredential: boolean;
  canSkipCredentialChange: boolean;
  credentialKind: CredentialKind | null;
  deviceProfiles: IDeviceProfile[];
}
