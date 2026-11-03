import { describe, expect, it } from 'vitest';

import { formatPhone, normalizePhone } from 'global/composables/phone';

describe('normalizePhone', () => {
  it.each([
    ['0661234518', '+212661234518'],
    ['06 61 23 45 18', '+212661234518'],
    ['+212 661-234-518', '+212661234518'],
    ['00212536682109', '+212536682109'],
    ['(0)7.70.88.12.40', '+212770881240'],
    ['661234518', '+212661234518'],
  ])('reads %s as %s', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it.each(['0461234518', '06612345', '+33612345678', 'abc'])('rejects %s', (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });
});

describe('formatPhone', () => {
  it('shows a stored number the Moroccan way', () => {
    expect(formatPhone('+212661234518')).toBe('06 61 23 45 18');
  });
});
