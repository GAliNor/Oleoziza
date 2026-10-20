<template>
  <div class="stagger flex flex-col gap-8">
    <auth-heading
      :eyebrow="$t('auth.changeCredential.eyebrow')"
      :title="$t(`auth.changeCredential.title.${kind}`)"
      :subtitle="$t('auth.changeCredential.subtitle', { firstName: authStore.session?.firstName })"
    />
    <credential-form :kind="kind" :submit-label="$t('auth.changeCredential.save')" :is-submitting="isLoading" @submit="handleSubmit" />
    <p v-if="errorMessage" class="form-error text-center" role="alert">{{ errorMessage }}</p>

    <div class="flex flex-col items-center gap-2">
      <button v-if="authStore.canSkipCredentialChange" type="button" class="link" :disabled="isLoading" @click="handleSkip">
        {{ $t('auth.changeCredential.skip') }}
      </button>
      <button type="button" class="link" @click="handleLogout">{{ $t('auth.logout') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useToastStore } from 'global/stores/toast';
import { useAuthError } from 'auth/composables/use-auth-error';
import type { CredentialKind } from 'auth/types/auth';

import AuthHeading from 'auth/components/auth-heading.vue';
import CredentialForm from 'auth/components/credential-form.vue';

// stores
const authStore = useAuthStore();
const toastStore = useToastStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { errorMessage, setError, clearError } = useAuthError();

// variables
const isLoading = ref(false);

// computed
const kind = computed((): CredentialKind => authStore.credentialKind ?? 'pin');

// methods
const goToRedirect = async (): Promise<void> => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
  await router.replace(redirect);
};

const runAndContinue = async (action: () => Promise<void>, successKey?: string): Promise<void> => {
  clearError();
  isLoading.value = true;
  try {
    await action();
    if (successKey) toastStore.push(t(successKey), 'success');
    await goToRedirect();
  } catch (error) {
    setError(error);
  } finally {
    isLoading.value = false;
  }
};

// event handlers
const handleSubmit = (secret: string): void => {
  runAndContinue(() => authStore.changeCredential(kind.value, secret), `auth.changeCredential.saved.${kind.value}`);
};

const handleSkip = (): void => {
  runAndContinue(() => authStore.skipCredentialChange());
};

const handleLogout = async (): Promise<void> => {
  await authStore.logout();
  await router.replace({ name: 'auth-login' });
};
</script>
