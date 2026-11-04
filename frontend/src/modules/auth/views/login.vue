<template>
  <div>
    <transition name="fade-step" mode="out-in">
      <login-identifier-step
        v-if="step === 'identifier'"
        key="identifier"
        v-model="identifierInput"
        :is-loading="isLoading"
        :error-message="errorMessage"
        @submit="handleIdentifierSubmit"
      />
      <offer-pin-step v-else-if="step === 'offerPin'" key="offerPin" :is-loading="isLoading" :error-message="errorMessage" @submit="handleOfferPinSubmit" @skip="handleOfferPinSkip" />
      <login-success v-else-if="step === 'success'" key="success" />
      <login-secret-step-panel
        v-else
        :key="step"
        v-model:secret="secret"
        :step="step"
        :identifier="identifier"
        :login-methods="loginMethods"
        :is-loading="isLoading"
        :error-message="errorMessage"
        @submit="handleSecretSubmit"
        @change-identifier="handleChangeIdentifier"
        @use-method="openStep"
        @error="setError"
      />
    </transition>
  </div>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAuthStore } from 'auth/stores/auth';
import { useToastStore } from 'global/stores/toast';
import { useAuthAction } from 'auth/composables/use-auth-action';
import { normalizeIdentifier } from 'auth/composables/normalize-identifier';
import type { LoginMethod, LoginSecretStep } from 'auth/types/auth';

import LoginIdentifierStep from 'auth/components/login-identifier-step.vue';
import LoginSecretStepPanel from 'auth/components/login-secret-step.vue';
import LoginSuccess from 'auth/components/login-success.vue';
import OfferPinStep from 'auth/components/offer-pin-step.vue';

// stores
const authStore = useAuthStore();
const toastStore = useToastStore();
const { t } = useI18n();
const { isLoading, errorMessage, setError, clearError, run, goToRedirect } = useAuthAction();

// variables
type LoginStep = 'identifier' | LoginSecretStep | 'offerPin' | 'success';

const SUCCESS_DELAY_MS = 1500;
const STEP_METHODS: Record<LoginSecretStep, LoginMethod> = {
  pin: 'phone_pin',
  password: 'email_password',
  otp: 'phone_otp',
};

const step = ref<LoginStep>('identifier');
const identifierInput = ref('');
const identifier = ref('');
const loginMethods = ref<LoginMethod[]>([]);
const secret = ref('');

// methods
const showSuccess = async (): Promise<void> => {
  step.value = 'success';
  await new Promise((resolve) => setTimeout(resolve, SUCCESS_DELAY_MS));
  await goToRedirect();
};

const openStep = (nextStep: LoginSecretStep): void => {
  clearError();
  secret.value = '';
  step.value = nextStep;
};

// event handlers
const handleIdentifierSubmit = async (): Promise<void> => {
  const normalized = normalizeIdentifier(identifierInput.value);
  if (!normalized) {
    setError({ code: 'invalid_identifier' });
    return;
  }
  await run(async () => {
    const options = await authStore.getLoginOptions(normalized);
    identifier.value = options.identifier;
    loginMethods.value = options.loginMethods;
    if (options.loginMethods.includes('email_password')) openStep('password');
    else if (options.loginMethods.includes('phone_pin')) openStep('pin');
    else openStep('otp');
  });
};

const handleSecretSubmit = async (value: string): Promise<void> => {
  if (step.value !== 'pin' && step.value !== 'password' && step.value !== 'otp') return;
  const method = STEP_METHODS[step.value];
  let canOfferPin = false;
  const isLoggedIn = await run(async () => {
    canOfferPin = (await authStore.login({ identifier: identifier.value, method, secret: value })).canOfferPin;
  });
  if (!isLoggedIn) secret.value = '';
  else if (canOfferPin) step.value = 'offerPin';
  else await showSuccess();
};

const handleChangeIdentifier = (): void => {
  clearError();
  secret.value = '';
  step.value = 'identifier';
};

const handleOfferPinSubmit = async (pin: string): Promise<void> => {
  const isSaved = await run(() => authStore.changeCredential('pin', pin));
  if (!isSaved) return;
  toastStore.push(t('auth.offerPin.saved'), 'success');
  await showSuccess();
};

const handleOfferPinSkip = (): void => {
  showSuccess();
};
</script>
