import { i18n } from '~/plugins/i18n';

/** The refusal in words (`site.errors.<code>`) when the code has a translation, else the generic message. */
export const siteErrorMessage = (code: string | null, fallback: string): string => {
  const key = `site.errors.${code}`;
  return code && i18n.global.te(key) ? i18n.global.t(key) : fallback;
};
