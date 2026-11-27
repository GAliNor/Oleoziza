import { i18n } from '~/plugins/i18n';

/** The Assistant's translation of an AI refusal code, or a generic failure. */
export const describeAiError = (code: string | null): string => {
  const { t, te } = i18n.global;
  if (code && te(`assistant.errors.${code}`)) return t(`assistant.errors.${code}`);
  if (code && te(`ai.errors.${code}`)) return t(`ai.errors.${code}`);
  return t('ai.test.failed');
};
