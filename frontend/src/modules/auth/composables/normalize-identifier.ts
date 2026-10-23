import { normalizePhone } from 'global/composables/phone';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (identifier: string): boolean => identifier.includes('@');

export const normalizeIdentifier = (raw: string): string | null => {
  const value = raw.trim();
  if (isEmail(value)) return EMAIL_PATTERN.test(value) ? value.toLowerCase() : null;
  return normalizePhone(value);
};
