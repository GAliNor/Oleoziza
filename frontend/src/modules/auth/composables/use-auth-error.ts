import { ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { isAuthError } from 'auth/stores/auth';
import { logDevError } from 'global/composables/with-status';
import { formatTime } from 'global/composables/date';

export const useAuthError = (): {
  errorMessage: Ref<string>;
  setError: (error: unknown) => void;
  clearError: () => void;
} => {
  const { t } = useI18n();
  const errorMessage = ref('');

  const setError = (error: unknown): void => {
    if (!isAuthError(error)) {
      logDevError(error);
      errorMessage.value = t('auth.errors.network');
      return;
    }
    const time = error.lockedUntil ? formatTime(error.lockedUntil) : '';
    errorMessage.value = t(`auth.errors.${error.code}`, { time });
  };

  const clearError = (): void => {
    errorMessage.value = '';
  };

  return { errorMessage, setError, clearError };
};
