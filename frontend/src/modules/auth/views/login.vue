<template>
  <div>
    <transition name="fade-step" mode="out-in">
      <div v-if="step === 'identifier'" key="identifier" class="stagger flex flex-col gap-8">
        <auth-heading :eyebrow="$t('auth.login.eyebrow')" :title="$t('auth.login.title')" :subtitle="$t('auth.login.subtitle')" />

        <form class="flex flex-col gap-5" @submit.prevent="handleIdentifierSubmit">
          <div class="flex flex-col gap-2">
            <label class="label" for="identifier">{{ $t('auth.login.identifier') }}</label>
            <input
              id="identifier"
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
            {{ $t('auth.login.continue') }}
            <arrow-right-line-icon class="h-4 w-4" />
          </button>
        </form>

        <router-link v-if="authStore.deviceProfiles.length" :to="{ name: 'auth-switch' }" class="link self-center">
          {{ $t('auth.switch.action') }}
        </router-link>

        <demo-users v-if="IS_MOCK_DATA_SOURCE" @select="handleDemoSelect" />
      </div>

      <div v-else-if="step === 'offerPin'" key="offerPin" class="stagger flex flex-col gap-8">
        <auth-heading :eyebrow="$t('auth.login.eyebrow')" :title="$t('auth.offerPin.title')" :subtitle="$t('auth.offerPin.subtitle')" />
        <credential-form kind="pin" :submit-label="$t('auth.offerPin.save')" :is-submitting="isLoading" @submit="handleOfferPinSubmit" />
        <p v-if="errorMessage" class="form-error text-center" role="alert">{{ errorMessage }}</p>
        <button type="button" class="link self-center" @click="handleOfferPinSkip">{{ $t('auth.offerPin.later') }}</button>
      </div>

      <div v-else-if="step === 'success'" key="success" class="stagger flex flex-col items-center gap-6 py-8 text-center" role="status">
        <div class="success-badge flex h-24 w-24 items-center justify-center rounded-full bg-success-green/10">
          <animated-check-icon class="h-12 w-12 text-success-green" />
        </div>
        <div class="flex flex-col gap-2">
          <h1 class="heading-one text-success-green">{{ $t('auth.login.success') }}</h1>
          <p class="body-two">{{ $t('auth.login.redirecting', { name: authStore.salutation }) }}</p>
        </div>
      </div>

      <div v-else :key="step" class="stagger flex flex-col gap-8">
        <auth-heading :eyebrow="$t('auth.login.eyebrow')" :title="$t(`auth.login.methodTitle.${step}`)" />

        <div class="flex items-center justify-between gap-3 rounded-2xl bg-neutral-100/80 py-2 pr-2 pl-4">
          <span class="truncate text-sm font-medium text-neutral-800">{{ displayIdentifier }}</span>
          <button type="button" class="btn-secondary min-h-9 shrink-0 px-4" @click="handleChangeIdentifier">
            {{ $t('auth.login.changeIdentifier') }}
          </button>
        </div>

        <pin-pad
          v-if="step === 'pin'"
          v-model="secret"
          :length="PIN_LENGTH"
          :is-disabled="isLoading"
          :has-error="!!errorMessage"
          @complete="handleSecretComplete"
        />

        <form v-else class="flex flex-col gap-5" @submit.prevent="handleSecretComplete(secret)">
          <div class="flex flex-col gap-2">
            <label class="label" :for="step">{{ $t(`auth.login.secretLabel.${step}`) }}</label>
            <code-input
              v-if="step === 'otp'"
              :id="step"
              v-model="secret"
              :length="OTP_LENGTH"
              :is-disabled="isLoading"
              @complete="handleSecretComplete"
            />
            <password-input v-else :id="step" v-model="secret" autocomplete="current-password" :is-disabled="isLoading" />
          </div>
          <button type="submit" class="btn-primary w-full" :disabled="isLoading || !secret">
            {{ $t('auth.login.submit') }}
            <arrow-right-line-icon class="h-4 w-4" />
          </button>
        </form>

        <p v-if="errorMessage" class="form-error text-center" role="alert">{{ errorMessage }}</p>

        <div class="flex flex-col items-center gap-3">
          <button v-if="step === 'otp'" type="button" class="link" :disabled="resendSeconds > 0" @click="handleResendCode">
            {{ resendSeconds > 0 ? $t('auth.login.resendIn', { seconds: resendSeconds }) : $t('auth.login.resend') }}
          </button>
          <button v-if="step === 'pin' && hasMethod('phone_otp')" type="button" class="link" @click="handleUseMethod('otp')">
            {{ $t('auth.login.useOtp') }}
          </button>
          <button v-if="step === 'otp' && hasMethod('phone_pin')" type="button" class="link" @click="handleUseMethod('pin')">
            {{ $t('auth.login.usePin') }}
          </button>
          <router-link v-if="step !== 'otp'" :to="{ name: 'auth-reset', query: { identifier } }" class="link">
            {{ $t(`auth.login.forgot.${step}`) }}
          </router-link>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useToastStore } from 'global/stores/toast';
import { useAuthError } from 'auth/composables/use-auth-error';
import { formatPhone, isEmail, normalizeIdentifier } from 'auth/composables/normalize-identifier';
import { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import { OTP_LENGTH, PIN_LENGTH } from 'auth/constants/auth';
import { MOCK_SMS_CODE } from 'auth/constants/mock-auth';
import type { LoginMethod } from 'auth/types/auth';

import AuthHeading from 'auth/components/auth-heading.vue';
import CodeInput from 'auth/components/code-input.vue';
import CredentialForm from 'auth/components/credential-form.vue';
import DemoUsers from 'auth/components/demo-users.vue';
import PasswordInput from 'auth/components/password-input.vue';
import PinPad from 'auth/components/pin-pad.vue';
import AnimatedCheckIcon from 'global/icons/animated-check.icon.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// stores
const authStore = useAuthStore();
const toastStore = useToastStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { errorMessage, setError, clearError } = useAuthError();

// variables
type LoginStep = 'identifier' | 'pin' | 'password' | 'otp' | 'offerPin' | 'success';

const RESEND_DELAY_S = 30;
const SUCCESS_DELAY_MS = 1500;
const STEP_METHODS: Record<'pin' | 'password' | 'otp', LoginMethod> = {
  pin: 'phone_pin',
  password: 'email_password',
  otp: 'phone_otp',
};

const step = ref<LoginStep>('identifier');
const identifierInput = ref('');
const identifier = ref('');
const loginMethods = ref<LoginMethod[]>([]);
const secret = ref('');
const isLoading = ref(false);
const resendSeconds = ref(0);
let resendTimer: ReturnType<typeof setInterval> | null = null;

// computed
const displayIdentifier = computed((): string =>
  isEmail(identifier.value) ? identifier.value : formatPhone(identifier.value),
);

// methods
const hasMethod = (method: LoginMethod): boolean => loginMethods.value.includes(method);

const goToRedirect = async (): Promise<void> => {
  step.value = 'success';
  await new Promise((resolve) => setTimeout(resolve, SUCCESS_DELAY_MS));
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
  await router.replace(redirect);
};

const startResendTimer = (): void => {
  resendSeconds.value = RESEND_DELAY_S;
  if (resendTimer) clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    resendSeconds.value -= 1;
    if (resendSeconds.value <= 0 && resendTimer) clearInterval(resendTimer);
  }, 1000);
};

const sendCode = async (): Promise<void> => {
  try {
    await authStore.requestCode(identifier.value);
    startResendTimer();
    if (IS_MOCK_DATA_SOURCE) toastStore.push(t('auth.dev.smsCode', { code: MOCK_SMS_CODE }), 'dev');
  } catch (error) {
    setError(error);
  }
};

const openStep = async (nextStep: 'pin' | 'password' | 'otp'): Promise<void> => {
  clearError();
  secret.value = '';
  step.value = nextStep;
  if (nextStep === 'otp') await sendCode();
};

const fetchLoginOptions = async (): Promise<void> => {
  clearError();
  const normalized = normalizeIdentifier(identifierInput.value);
  if (!normalized) {
    setError({ code: 'invalid_identifier' });
    return;
  }
  isLoading.value = true;
  try {
    const options = await authStore.getLoginOptions(normalized);
    identifier.value = options.identifier;
    loginMethods.value = options.loginMethods;
    if (hasMethod('email_password')) await openStep('password');
    else if (hasMethod('phone_pin')) await openStep('pin');
    else await openStep('otp');
  } catch (error) {
    setError(error);
  } finally {
    isLoading.value = false;
  }
};

const login = async (value: string): Promise<void> => {
  if (step.value === 'identifier' || step.value === 'offerPin' || step.value === 'success') return;
  clearError();
  isLoading.value = true;
  try {
    const result = await authStore.login({ identifier: identifier.value, method: STEP_METHODS[step.value], secret: value });
    if (result.canOfferPin) {
      step.value = 'offerPin';
      return;
    }
    await goToRedirect();
  } catch (error) {
    setError(error);
    secret.value = '';
  } finally {
    isLoading.value = false;
  }
};

// event handlers
const handleIdentifierSubmit = (): void => {
  fetchLoginOptions();
};

const handleDemoSelect = (value: string): void => {
  identifierInput.value = value;
  fetchLoginOptions();
};

const handleSecretComplete = (value: string): void => {
  login(value);
};

const handleUseMethod = (nextStep: 'pin' | 'otp'): void => {
  openStep(nextStep);
};

const handleResendCode = (): void => {
  sendCode();
};

const handleChangeIdentifier = (): void => {
  clearError();
  secret.value = '';
  step.value = 'identifier';
};

const handleOfferPinSubmit = async (pin: string): Promise<void> => {
  clearError();
  isLoading.value = true;
  try {
    await authStore.changeCredential('pin', pin);
    toastStore.push(t('auth.offerPin.saved'), 'success');
    await goToRedirect();
  } catch (error) {
    setError(error);
  } finally {
    isLoading.value = false;
  }
};

const handleOfferPinSkip = (): void => {
  goToRedirect();
};

// lifecycle
onBeforeUnmount(() => {
  if (resendTimer) clearInterval(resendTimer);
});
</script>

<style scoped>
.success-badge {
  animation: badge-pop 0.6s var(--ease-premium) both;
}

@keyframes badge-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

@media (prefers-reduced-motion: reduce) {
  .success-badge {
    animation: none;
  }
}
</style>
