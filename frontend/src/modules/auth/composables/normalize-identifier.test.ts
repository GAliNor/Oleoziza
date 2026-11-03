import { describe, expect, it } from 'vitest';

import { isEmail, normalizeIdentifier } from 'auth/composables/normalize-identifier';

describe('normalizeIdentifier', () => {
  it('lowercases a valid email', () => {
    expect(normalizeIdentifier('  Hamid.Ziani@Mail.MA ')).toBe('hamid.ziani@mail.ma');
  });

  it('rejects a malformed email', () => {
    expect(normalizeIdentifier('hamid@mail')).toBeNull();
  });

  it('normalizes a phone number', () => {
    expect(normalizeIdentifier('06 61 23 45 18')).toBe('+212661234518');
  });

  it('rejects anything else', () => {
    expect(normalizeIdentifier('hamid')).toBeNull();
  });
});

describe('isEmail', () => {
  it('tells an email from a phone by the @', () => {
    expect([isEmail('a@b.ma'), isEmail('0661234518')]).toEqual([true, false]);
  });
});
