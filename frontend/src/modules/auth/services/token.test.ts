import { beforeAll, describe, expect, it, vi } from 'vitest';

import { importJwtKey, signJwt } from '~/plugins/jose';

import TokenService, { parseAccessClaims } from 'auth/services/token';
import { MOCK_SIGNING_JWK } from 'auth/constants/mock-auth';

const signMockToken = async (): Promise<string> => {
  const expiresAt = Math.floor(Date.now() / 1000) + 60;
  const claims = { sid: 's1', role: 'operator', isOwner: false, sites: { oujda: ['reception.create'] }, firstName: 'Hamid', lastName: 'Ziani' };
  return signJwt(claims, 'u1', expiresAt, await importJwtKey(MOCK_SIGNING_JWK));
};

describe('TokenService.verify', () => {
  beforeAll(() => {
    const { kty, crv, x, y } = MOCK_SIGNING_JWK;
    vi.stubEnv('VITE_AUTH_PUBLIC_JWK', JSON.stringify({ kty, crv, x, y }));
  });

  it('reads the claims of a token signed with the dev key', async () => {
    const claims = await new TokenService().verify(await signMockToken());
    expect(claims).toMatchObject({ sub: 'u1', sid: 's1', role: 'operator', firstName: 'Hamid', sites: { oujda: ['reception.create'] } });
  });

  it('rejects a tampered token', async () => {
    const [header, payload, signature] = (await signMockToken()).split('.');
    const forged = btoa(atob(payload.replace(/-/g, '+').replace(/_/g, '/')).replace('operator', 'management')).replace(/=+$/, '');
    await expect(new TokenService().verify([header, forged, signature].join('.'))).rejects.toThrow();
  });
});

describe('parseAccessClaims', () => {
  const VALID = { sub: 'u1', sid: 's1', role: 'operator', isOwner: false, sites: { oujda: ['reception.create'] }, firstName: 'Hamid', lastName: 'Ziani', exp: 1 };

  it('accepts claims of the expected shape, with or without Sites', () => {
    const { sites: _sites, ...clientClaims } = VALID;
    expect([parseAccessClaims(VALID).sub, parseAccessClaims({ ...clientClaims, role: 'client' }).role]).toEqual(['u1', 'client']);
  });

  it.each([
    ['no subject', { ...VALID, sub: undefined }],
    ['an unknown Role', { ...VALID, role: 'admin' }],
    ['a text expiry', { ...VALID, exp: '1' }],
    ['malformed Sites', { ...VALID, sites: { oujda: 'all' } }],
    ['not an object', 'token'],
  ])('rejects %s', (_label, claims) => {
    expect(() => parseAccessClaims(claims)).toThrow('Invalid access token claims');
  });
});
