import { importJwtKey, readUnverifiedJwt, verifyJwt } from '~/plugins/jose';
import type { JwtKey } from '~/plugins/jose';

import { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import { hasWebCrypto } from 'global/composables/crypto';
import type { IAccessClaims } from 'auth/types/auth';

export default class TokenService {
  private static _publicKey: Promise<JwtKey> | null = null;

  private getPublicKey(): Promise<JwtKey> {
    TokenService._publicKey ??= importJwtKey(JSON.parse(import.meta.env.VITE_AUTH_PUBLIC_JWK));
    return TokenService._publicKey;
  }

  async verify(token: string): Promise<IAccessClaims> {
    if (IS_MOCK_DATA_SOURCE && !hasWebCrypto()) return readUnverifiedJwt(token) as IAccessClaims;
    return (await verifyJwt(token, await this.getPublicKey())) as IAccessClaims;
  }
}
