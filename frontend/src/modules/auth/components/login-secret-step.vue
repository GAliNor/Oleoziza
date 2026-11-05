<template>
  <div class="stagger flex flex-col gap-8">
    <auth-heading :eyebrow="$t('auth.login.eyebrow')" :title="$t(`auth.login.methodTitle.${step}`)" />

    <div class="flex items-center justify-between gap-3 rounded-card bg-subtle/80 py-2 pe-2 ps-4">
      <span class="truncate label">{{ displayIdentifier }}</span>
      <button type="button" class="btn-secondary min-h-9 shrink-0 px-4" @click="emit('changeIdentifier')">
        {{ $t('auth.login.changeIdentifier') }}
      </button>
    </div>

    <pin-pad v-if="step === 'pin'" v-model="secret" :length="PIN_LENGTH" :is-disabled="isLoading" :has-error="!!errorMessage" @complete="emit('submit', $event)" />

    <form v-else class="flex flex-col gap-5" @submit.prevent="emit('submit', secret)">
      <ui-field v-slot="{ id }" :label="$t(`auth.login.secretLabel.${step}`)">
        <code-input v-if="step === 'otp'" :id="id" v-model="secret" :length="OTP_LENGTH" :is-disabled="isLoading" @complete="emit('submit', $event)" />
        <password-input v-else :id="id" v-model="secret" autocomplete="current-password" :is-disabled="isLoading" />
      </ui-field>
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
      <button v-if="step === 'pin' && loginMethods.includes('phone_otp')" type="button" class="link" @click="emit('useMethod', 'otp')">
        {{ $t('auth.login.useOtp') }}
      </button>
      <button v-if="step === 'otp' && loginMethods.includes('phone_pin')" type="button" class="link" @click="emit('useMethod', 'pin')">
        {{ $t('auth.login.usePin') }}
      </button>
      <router-link v-if="step !== 'otp'" :to="{ name: 'auth-reset', query: { identifier } }" class="link">
        {{ $t(`auth.login.forgot.${step}`) }}
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAuthStore } from 'auth/stores/auth';
import { useToastStore } from 'global/stores/toast';
import { formatPhone } from 'global/composables/phone';
import { isEmail } from 'auth/composables/normalize-identifier';
import { IS_MOCK_DATA_SOURCE } from 'global/services/base';
import { OTP_LENGTH, PIN_LENGTH } from 'auth/constants/auth';
import { MOCK_SMS_CODE } from 'auth/constants/mock-auth';
import type { LoginMethod, SecretStep } from 'auth/types/auth';

import UiField from 'global/components/ui-field.vue';
import AuthHeading from 'auth/components/auth-heading.vue';
import CodeInput from 'auth/components/code-input.vue';
import PasswordInput from 'auth/components/password-input.vue';
import PinPad from 'auth/components/pin-pad.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// props
const props = defineProps<{ step: SecretStep; identifier: string; loginMethods: LoginMethod[]; isLoading: boolean; errorMessage: string }>();

// emits
const emit = defineEmits<{
  (event: 'submit', secret: string): void;
  (event: 'changeIdentifier'): void;
  (event: 'useMethod', step: 'pin' | 'otp'): void;
  (event: 'error', error: unknown): void;
}>();

// stores
const { t } = useI18n();
const authStore = useAuthStore();
const toastStore = useToastStore();

// variables
const RESEND_DELAY_S = 30;
const secret = defineModel<string>('secret', { required: true });
const resendSeconds = ref(0);
let resendTimer: ReturnType<typeof setInterval> | null = null;

// computed
const displayIdentifier = computed((): string => (isEmail(props.identifier) ? props.identifier : formatPhone(props.identifier)));

// methods
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
    await authStore.requestCode(props.identifier);
    startResendTimer();
    if (IS_MOCK_DATA_SOURCE) toastStore.push(t('auth.dev.smsCode', { code: MOCK_SMS_CODE }), 'dev');
  } catch (error) {
    emit('error', error);
  }
};

// event handlers
const handleResendCode = (): void => {
  sendCode();
};

// lifecycle
onMounted(() => {
  if (props.step === 'otp') sendCode();
});

onBeforeUnmount(() => {
  if (resendTimer) clearInterval(resendTimer);
});
</script>
