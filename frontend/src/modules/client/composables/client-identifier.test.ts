import { describe, expect, it } from 'vitest';

import { normalizeClientIdentifier } from 'client/composables/client-identifier';
import { CLIENT_RECORDS_MOCK } from 'client/constants/mock-client-records';

describe('normalizeClientIdentifier', () => {
  it('stores a CIN in capitals, without spaces', () => {
    expect([normalizeClientIdentifier('individual', ' f 486168 '), normalizeClientIdentifier('individual', 'ab123456')]).toEqual(['F486168', 'AB123456']);
  });

  it('refuses what cannot be a CIN', () => {
    expect(['486168', 'ABC123456', 'F12', 'F1234567', ''].map((raw) => normalizeClientIdentifier('individual', raw))).toEqual([null, null, null, null, null]);
  });

  it('keeps an ICE at exactly 15 digits, however it is grouped', () => {
    expect(normalizeClientIdentifier('company', '001 234 567 000 089')).toBe('001234567000089');
    expect(['00123456700008', '0012345670000890', 'F486168'].map((raw) => normalizeClientIdentifier('company', raw))).toEqual([null, null, null]);
  });

  it('accepts every mock Client’s number as it is', () => {
    CLIENT_RECORDS_MOCK.forEach((record) => expect([record.name, normalizeClientIdentifier(record.kind, record.identifier)]).toEqual([record.name, record.identifier]));
  });
});
