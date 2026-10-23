const MOROCCAN_PHONE_PATTERN = /^(?:(?:\+|00)212|0)?([5-7]\d{8})$/;

export const normalizePhone = (raw: string): string | null => {
  const match = raw.trim().replace(/[\s.\-()]/g, '').match(MOROCCAN_PHONE_PATTERN);
  return match ? `+212${match[1]}` : null;
};

export const formatPhone = (phone: string): string =>
  phone.replace(/^\+212(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '0$1 $2 $3 $4 $5');
