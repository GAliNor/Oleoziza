import type { ClientKind } from 'client/types/client';

const IDENTIFIER_PATTERNS: Record<ClientKind, RegExp> = {
  individual: /^[A-Z]{1,2}\d{4,6}$/,
  company: /^\d{15}$/,
};

/** A CIN (one or two letters, then digits) or an ICE (15 digits) as stored, whatever the spacing and case typed; `null` when it cannot be one. */
export const normalizeClientIdentifier = (kind: ClientKind, raw: string): string | null => {
  const value = raw.replace(/[\s.-]/g, '').toUpperCase();
  return IDENTIFIER_PATTERNS[kind].test(value) ? value : null;
};
