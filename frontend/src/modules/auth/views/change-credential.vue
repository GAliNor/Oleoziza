<template>
  <div class="stagger flex flex-col gap-8">
    <auth-heading
      :eyebrow="$t('auth.changeCredential.eyebrow')"
      :title="$t(`auth.changeCredential.title.${kind}`)"
      :subtitle="$t('auth.changeCredential.subtitle', { firstName: sessionStore.session?.firstName })"
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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { useAuthAction } from 'auth/composables/use-auth-action';
import type { CredentialKind } from 'auth/types/auth';

import AuthHeading from 'auth/components/auth-heading.vue';
import CredentialForm from 'auth/components/credential-form.vue';

// stores
const authStore = useAuthStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();
const router = useRouter();
const { t } = useI18n();
const { isLoading, errorMessage, run, goToRedirect } = useAuthAction();

// computed
const kind = computed((): CredentialKind => authStore.credentialKind ?? 'pin');

// event handlers
const handleSubmit = async (secret: string): Promise<void> => {
  const savedKind = kind.value;
  if (!(await run(() => authStore.changeCredential(savedKind, secret)))) return;
  toastStore.push(t(`auth.changeCredential.saved.${savedKind}`), 'success');
  await goToRedirect();
};

const handleSkip = async (): Promise<void> => {
  if (await run(() => authStore.skipCredentialChange())) await goToRedirect();
};

const handleLogout = async (): Promise<void> => {
  await authStore.logout();
  await router.replace({ name: 'auth-login' });
};
</script>
