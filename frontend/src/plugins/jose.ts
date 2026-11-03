// imports
import { SignJWT, UnsecuredJWT, compactVerify, decodeJwt, importJWK } from 'jose';
import type { CryptoKey, JWK, JWTPayload } from 'jose';

// variables
const ALGORITHM = 'ES256';

export type JwtKey = CryptoKey | Uint8Array;

// methods
export const importJwtKey = (jwk: JWK): Promise<JwtKey> => importJWK(jwk, ALGORITHM);

export const verifyJwt = async (token: string, key: JwtKey): Promise<unknown> => {
  const { payload } = await compactVerify(token, key, { algorithms: [ALGORITHM] });
  return JSON.parse(new TextDecoder().decode(payload));
};

export const readUnverifiedJwt = (token: string): unknown => decodeJwt(token);

/** Signs with `key`, or writes an unsigned token when the browser has no WebCrypto (mock only). */
export const signJwt = (claims: JWTPayload, subject: string, expiresAt: number, key: JwtKey | null): Promise<string> => {
  if (!key) return Promise.resolve(new UnsecuredJWT(claims).setSubject(subject).setIssuedAt().setExpirationTime(expiresAt).encode());
  return new SignJWT(claims).setProtectedHeader({ alg: ALGORITHM }).setSubject(subject).setIssuedAt().setExpirationTime(expiresAt).sign(key);
};
