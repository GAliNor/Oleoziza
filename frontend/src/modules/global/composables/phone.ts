import { isRtl } from 'global/composables/language';

const MOROCCAN_PHONE_PATTERN = /^(?:(?:\+|00)212|0)?([5-7]\d{8})$/;

export const normalizePhone = (raw: string): string | null => {
  const match = raw.trim().replace(/[\s.\-()]/g, '').match(MOROCCAN_PHONE_PATTERN);
  return match ? `+212${match[1]}` : null;
};

/** Isolated in right-to-left text, or its groups of digits would swap places. */
export const formatPhone = (phone: string): string => {
  const formatted = phone.replace(/^\+212(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '0$1 $2 $3 $4 $5');
  return isRtl() ? `\u2066${formatted}\u2069` : formatted;
};

/** Groups a number while it is typed: « 06 61 23 45 18 », « +212 6 61 23 45 18 ». Anything else is left as typed. */
export const formatPhoneTyping = (raw: string): string => {
  const compact = raw.replace(/[\s.\-()]/g, '');
  const pairs = (digits: string): string => digits.replace(/(\d{2})(?=\d)/g, '$1 ');
  const international = compact.match(/^(\+212|00212)(\d?)(\d*)$/);
  if (international) return [international[1], international[2], pairs(international[3])].filter(Boolean).join(' ');
  return /^\d+$/.test(compact) ? pairs(compact) : raw;
};
