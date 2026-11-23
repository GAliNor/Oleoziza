import { i18n } from '~/plugins/i18n';

/** Why a change to an Expense was refused, in words. */
export const expenseErrorMessage = (code: string | null): string => {
  const key = `global.errors.${code}`;
  return code && i18n.global.te(key) ? i18n.global.t(key) : i18n.global.t('expense.errors.generic');
};
