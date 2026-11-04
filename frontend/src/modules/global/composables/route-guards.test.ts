import { describe, expect, it } from 'vitest';
import type { RouteLocationNormalized } from 'vue-router';

import { checkParam } from 'global/composables/route-guards';
import { ID_PARAM_PATTERN, TOKEN_PARAM_PATTERN } from 'global/constants/route-params';
import { LOT_CODE_PARAM_PATTERN } from 'lot/constants/lot';

const FALLBACK = { name: 'home' };

const enter = (guard: ReturnType<typeof checkParam>, params: RouteLocationNormalized['params']): unknown =>
  guard.call(undefined, { params } as RouteLocationNormalized, {} as RouteLocationNormalized, () => undefined);

describe('checkParam', () => {
  const idGuard = checkParam('id', { pattern: ID_PARAM_PATTERN, fallback: FALLBACK });

  it('opens the route when the param has the expected shape', () => {
    expect(enter(idGuard, { id: 'c0a1b2c3-0001-4000-8000-000000000001' })).toBe(true);
  });

  it('redirects a malformed or repeated param', () => {
    expect([enter(idGuard, { id: '../admin' }), enter(idGuard, { id: ['a', 'b'] }), enter(idGuard, {})]).toEqual([FALLBACK, FALLBACK, FALLBACK]);
  });

  it('lets an optional param be missing but still checks it when present', () => {
    const tokenGuard = checkParam('token', { pattern: TOKEN_PARAM_PATTERN, fallback: FALLBACK, isOptional: true });
    expect([enter(tokenGuard, {}), enter(tokenGuard, { token: '' }), enter(tokenGuard, { token: 'demo-reset' }), enter(tokenGuard, { token: 'x' })]).toEqual([
      true,
      true,
      true,
      FALLBACK,
    ]);
  });
});

describe('LOT_CODE_PARAM_PATTERN', () => {
  it.each(['OJ-2627-0158', 'BK-2627-0087', 'L-0001'])('accepts %s', (code) => {
    expect(LOT_CODE_PARAM_PATTERN.test(code)).toBe(true);
  });

  it.each(['oj-2627', 'OJ--1', 'OJ 2627', ''])('rejects %j', (code) => {
    expect(LOT_CODE_PARAM_PATTERN.test(code)).toBe(false);
  });
});
