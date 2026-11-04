import { importJwtKey, readUnverifiedJwt, verifyJwt } from '~/plugins/jose';
import type { JwtKey } from '~/plugins/jose';

import { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import { hasWebCrypto } from 'global/composables/crypto';
import type { IAccessClaims } from 'auth/types/auth';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const isPermissionList = (value: unknown): boolean => Array.isArray(value) && value.every((item) => typeof item === 'string');

/** Checks the shape of a verified token's claims, once, where they enter the app. */
export const parseAccessClaims = (payload: unknown): IAccessClaims => {
  const isValid =
    isRecord(payload) &&
    typeof payload.sub === 'string' &&
    typeof payload.sid === 'string' &&
    (payload.role === 'management' || payload.role === 'operator' || payload.role === 'client') &&
    typeof payload.isOwner === 'boolean' &&
    typeof payload.firstName === 'string' &&
    typeof payload.lastName === 'string' &&
    typeof payload.exp === 'number' &&
    (payload.sites === undefined || (isRecord(payload.sites) && Object.values(payload.sites).every(isPermissionList)));
  if (!isValid) throw new Error('Invalid access token claims');
  return payload as unknown as IAccessClaims;
};

export default class TokenService {
  private static _publicKey: Promise<JwtKey> | null = null;

  private getPublicKey(): Promise<JwtKey> {
    TokenService._publicKey ??= importJwtKey(JSON.parse(import.meta.env.VITE_AUTH_PUBLIC_JWK));
    return TokenService._publicKey;
  }

  async verify(token: string): Promise<IAccessClaims> {
    if (IS_MOCK_DATA_SOURCE && !hasWebCrypto()) return parseAccessClaims(readUnverifiedJwt(token));
    return parseAccessClaims(await verifyJwt(token, await this.getPublicKey()));
  }
}
