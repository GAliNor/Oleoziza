<template>
  <div>
    <transition name="fade-step" mode="out-in">
      <div :key="step" class="stagger flex flex-col gap-8">
        <auth-heading :eyebrow="$t('auth.reset.eyebrow')" :title="$t(`auth.reset.title.${step}`)" :subtitle="subtitle" />

        <form v-if="step === 'identifier'" class="flex flex-col gap-5" @submit.prevent="handleIdentifierSubmit">
          <div class="flex flex-col gap-2">
            <label class="label" for="reset-identifier">{{ $t('auth.login.identifier') }}</label>
            <input
              id="reset-identifier"
              v-model="identifierInput"
              class="input"
              type="text"
              inputmode="email"
              autocomplete="username"
              :placeholder="$t('auth.login.identifierPlaceholder')"
              :disabled="isLoading"
            />
          </div>
          <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
          <button type="submit" class="btn-primary w-full" :disabled="isLoading || !identifierInput.trim()">
            {{ $t('auth.reset.send') }}
            <arrow-right-line-icon class="h-4 w-4" />
          </button>
        </form>

        <form v-else-if="step === 'code'" class="flex flex-col gap-5" @submit.prevent="handleCodeSubmit">
          <div class="flex flex-col gap-2">
            <label class="label" for="reset-code">{{ $t('auth.login.secretLabel.otp') }}</label>
            <code-input id="reset-code" v-model="code" :length="OTP_LENGTH" @complete="handleCodeSubmit" />
          </div>
          <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
          <button type="submit" class="btn-primary w-full" :disabled="code.length !== OTP_LENGTH">
            {{ $t('auth.login.continue') }}
            <arrow-right-line-icon class="h-4 w-4" />
          </button>
        </form>

        <template v-else-if="step === 'newSecret'">
          <credential-form :kind="credentialKind" :submit-label="$t('auth.reset.save')" :is-submitting="isLoading" @submit="handleSecretSubmit" />
          <p v-if="errorMessage" class="form-error text-center" role="alert">{{ errorMessage }}</p>
        </template>

        <router-link v-if="step === 'done'" :to="{ name: 'auth-login' }" class="btn-primary w-full">
          {{ $t('auth.backToLogin') }}
        </router-link>
        <router-link v-else :to="{ name: 'auth-login' }" class="link inline-flex items-center gap-1 self-center">
          <arrow-left-line-icon class="h-4 w-4" />
          {{ $t('auth.backToLogin') }}
        </router-link>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { useAuthStore, isAuthError } from 'auth/stores/auth';
import { useToastStore } from 'global/stores/toast';
import { useAuthError } from 'auth/composables/use-auth-error';
import { normalizeIdentifier } from 'auth/composables/normalize-identifier';
import { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import { OTP_LENGTH } from 'auth/constants/auth';
import { MOCK_RESET_LINK_TOKEN, MOCK_SMS_CODE } from 'auth/constants/mock-auth';
import type { CredentialKind } from 'auth/types/auth';

import AuthHeading from 'auth/components/auth-heading.vue';
import CodeInput from 'auth/components/code-input.vue';
import CredentialForm from 'auth/components/credential-form.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// stores
const authStore = useAuthStore();
const toastStore = useToastStore();
const route = useRoute();
const { t } = useI18n();
const { errorMessage, setError, clearError } = useAuthError();

// variables
type ResetStep = 'identifier' | 'code' | 'emailSent' | 'staff' | 'newSecret' | 'done';

const resetToken = typeof route.params.token === 'string' && route.params.token ? route.params.token : null;
const step = ref<ResetStep>(resetToken ? 'newSecret' : 'identifier');
const identifierInput = ref(typeof route.query.identifier === 'string' ? route.query.identifier : '');
const identifier = ref('');
const code = ref('');
const credentialKind = ref<CredentialKind>(resetToken ? 'password' : 'pin');
const isLoading = ref(false);

// computed
const subtitle = computed((): string => t(`auth.reset.subtitle.${step.value}`));

// methods
const requestReset = async (): Promise<void> => {
  clearError();
  const normalized = normalizeIdentifier(identifierInput.value);
  if (!normalized) {
    setError({ code: 'invalid_identifier' });
    return;
  }
  isLoading.value = true;
  try {
    const request = await authStore.requestReset(normalized);
    identifier.value = normalized;
    credentialKind.value = request.credentialKind;
    step.value = request.channel === 'sms' ? 'code' : 'emailSent';
    if (IS_MOCK_DATA_SOURCE) {
      toastStore.push(
        request.channel === 'sms'
          ? t('auth.dev.smsCode', { code: MOCK_SMS_CODE })
          : t('auth.dev.resetLink', { link: `/reset/${MOCK_RESET_LINK_TOKEN}` }),
        'dev',
      );
    }
  } catch (error) {
    if (isAuthError(error) && error.code === 'staff_reset') step.value = 'staff';
    else setError(error);
  } finally {
    isLoading.value = false;
  }
};

const resetCredential = async (secret: string): Promise<void> => {
  clearError();
  isLoading.value = true;
  try {
    await authStore.resetCredential(
      resetToken ? { resetToken, secret } : { identifier: identifier.value, code: code.value, secret },
    );
    step.value = 'done';
  } catch (error) {
    setError(error);
    if (isAuthError(error) && error.code === 'invalid_code') {
      code.value = '';
      step.value = 'code';
    }
  } finally {
    isLoading.value = false;
  }
};

// event handlers
const handleIdentifierSubmit = (): void => {
  requestReset();
};

const handleCodeSubmit = (): void => {
  if (code.value.length !== OTP_LENGTH) return;
  clearError();
  step.value = 'newSecret';
};

const handleSecretSubmit = (secret: string): void => {
  resetCredential(secret);
};
</script>
