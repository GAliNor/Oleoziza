import { ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { isAuthError } from 'auth/stores/auth';

export const useAuthError = (): {
  errorMessage: Ref<string>;
  setError: (error: unknown) => void;
  clearError: () => void;
} => {
  const { t, d } = useI18n();
  const errorMessage = ref('');

  const setError = (error: unknown): void => {
    if (!isAuthError(error)) {
      console.error(error);
      errorMessage.value = t('auth.errors.network');
      return;
    }
    const time = error.lockedUntil ? d(new Date(error.lockedUntil), { hour: '2-digit', minute: '2-digit' }) : '';
    errorMessage.value = t(`auth.errors.${error.code}`, { time });
  };

  const clearError = (): void => {
    errorMessage.value = '';
  };

  return { errorMessage, setError, clearError };
};
