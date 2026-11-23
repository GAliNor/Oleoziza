import { i18n } from '~/plugins/i18n';

/** Why a change to a User was refused, in words. */
export const userErrorMessage = (code: string | null): string => {
  const key = `global.errors.${code}`;
  return code && i18n.global.te(key) ? i18n.global.t(key) : i18n.global.t('user.detail.error');
};

/** « Déjà utilisé par Ahmed B. », or without the name when it may not be shown. */
export const takenMessage = (holder: string | null): string | null => {
  if (holder === null) return null;
  return holder ? i18n.global.t('global.form.takenBy', { name: holder }) : i18n.global.t('global.form.taken');
};
