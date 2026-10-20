export const PIN_LENGTH = 4;
export const OTP_LENGTH = 6;
export const PASSWORD_MIN_LENGTH = 8;

export const REFRESH_MARGIN_MS = 60_000;

export const STORAGE_KEYS = {
  accessToken: 'oleoziza.auth.accessToken',
  credentialChange: 'oleoziza.auth.credentialChange',
  deviceProfiles: 'oleoziza.auth.deviceProfiles',
  lastSite: 'oleoziza.site.last.',
} as const;
