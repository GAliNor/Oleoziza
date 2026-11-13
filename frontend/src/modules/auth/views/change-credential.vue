<template>
  <div class="stagger flex flex-col gap-8">
    <auth-heading
      :eyebrow="$t('auth.changeCredential.eyebrow')"
      :title="$t(`auth.changeCredential.title.${kind}`)"
      :subtitle="isForced ? $t('auth.changeCredential.subtitle', { firstName }) : $t('auth.changeCredential.voluntarySubtitle', { firstName })"
    />
    <ui-segmented
      v-if="!isForced && kinds.length > 1"
      is-full
      is-choice
      :model-value="kind"
      :options="kindOptionsComputed"
      :label="$t('auth.changeCredential.kindLabel')"
      :is-disabled="isLoading"
      @update:model-value="handleKind"
    />
    <ui-field v-if="!isForced" v-slot="{ id }" :label="$t('auth.changeCredential.current')">
      <password-input :id="id" v-model="currentSecret" autocomplete="current-password" :is-disabled="isLoading" />
    </ui-field>
    <credential-form :key="kind" :kind="kind" :submit-label="$t('auth.changeCredential.save')" :is-submitting="isLoading" @submit="handleSubmit" />
    <p v-if="localError || errorMessage" class="form-error text-center" role="alert">{{ localError || errorMessage }}</p>
    <div class="flex flex-col items-center gap-2">
      <button v-if="isForced && authStore.canSkipCredentialChange" type="button" class="link" :disabled="isLoading" @click="handleSkip">
        {{ $t('auth.changeCredential.skip') }}
      </button>
      <button v-if="isForced" type="button" class="link" @click="handleLogout">{{ $t('auth.logout') }}</button>
      <button v-else type="button" class="link" :disabled="isLoading" @click="goToRedirect">{{ $t('auth.changeCredential.back') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'auth/stores/auth';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { useAuthAction } from 'auth/composables/use-auth-action';
import type { CredentialKind } from 'auth/types/auth';
import UiField from 'global/components/ui-field.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import AuthHeading from 'auth/components/auth-heading.vue';
import CredentialForm from 'auth/components/credential-form.vue';
import PasswordInput from 'auth/components/password-input.vue';

// stores
const authStore = useAuthStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();
const router = useRouter();
const { t } = useI18n();
const { isLoading, errorMessage, run, goToRedirect } = useAuthAction();

// computed
const isForced = computed((): boolean => authStore.mustChangeCredential);
const firstName = computed((): string => sessionStore.session?.firstName ?? '');
const kinds = computed((): CredentialKind[] => {
  const held = sessionStore.session?.credentialKinds ?? [];
  return held.length ? held : [authStore.credentialKind ?? 'pin'];
});

// variables
const kindOptionsComputed = computed((): { key: CredentialKind; label: string }[] => kinds.value.map((option) => ({ key: option, label: t(`auth.changeCredential.kind.${option}`) })));
const kind = ref<CredentialKind>(isForced.value ? (authStore.credentialKind ?? 'pin') : kinds.value[0]);
const currentSecret = ref('');
const localError = ref('');

// event handlers
const handleKind = (option: CredentialKind): void => {
  kind.value = option;
  localError.value = '';
};
const handleSubmit = async (secret: string): Promise<void> => {
  localError.value = '';
  if (!isForced.value && !currentSecret.value) {
    localError.value = t('auth.changeCredential.currentRequired');
    return;
  }
  const savedKind = kind.value;
  const isSaved = await run(() => authStore.changeCredential(savedKind, secret, isForced.value ? undefined : currentSecret.value));
  if (!isSaved) return;
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
