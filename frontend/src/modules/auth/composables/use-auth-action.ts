import { ref, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthError } from 'auth/composables/use-auth-error';

/** Runs a sign-in step: raises isLoading meanwhile, shows its error, and tells the caller whether it worked. */
export const useAuthAction = (): {
  isLoading: Ref<boolean>;
  errorMessage: Ref<string>;
  setError: (error: unknown) => void;
  clearError: () => void;
  run: (action: () => Promise<void>) => Promise<boolean>;
  goToRedirect: () => Promise<void>;
} => {
  const route = useRoute();
  const router = useRouter();
  const { errorMessage, setError, clearError } = useAuthError();
  const isLoading = ref(false);

  const run = async (action: () => Promise<void>): Promise<boolean> => {
    clearError();
    isLoading.value = true;
    try {
      await action();
      return true;
    } catch (error) {
      setError(error);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const goToRedirect = async (): Promise<void> => {
    await router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/');
  };

  return { isLoading, errorMessage, setError, clearError, run, goToRedirect };
};
