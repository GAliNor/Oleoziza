import { compactVerify, importJWK, type CryptoKey } from 'jose';

import type { IAccessClaims } from 'auth/types/auth';

export default class TokenService {
  private static _publicKey: Promise<CryptoKey | Uint8Array> | null = null;

  private getPublicKey(): Promise<CryptoKey | Uint8Array> {
    TokenService._publicKey ??= importJWK(JSON.parse(import.meta.env.VITE_AUTH_PUBLIC_JWK), 'ES256');
    return TokenService._publicKey;
  }

  async verify(token: string): Promise<IAccessClaims> {
    const { payload } = await compactVerify(token, await this.getPublicKey(), { algorithms: ['ES256'] });
    return JSON.parse(new TextDecoder().decode(payload)) as IAccessClaims;
  }
}
