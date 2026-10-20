<template>
  <div v-if="kind === 'pin'" class="flex flex-col gap-4">
    <p class="body-one text-center">
      {{ isConfirming ? $t('auth.credential.confirmPin') : $t('auth.credential.choosePin', { length: PIN_LENGTH }) }}
    </p>
    <pin-pad
      v-model="pin"
      :length="PIN_LENGTH"
      :is-disabled="isSubmitting"
      :has-error="!!localError"
      @complete="handlePinComplete"
    />
    <p v-if="localError" class="form-error text-center" role="alert">{{ localError }}</p>
  </div>

  <form v-else class="flex flex-col gap-5" @submit.prevent="handlePasswordSubmit">
    <div class="flex flex-col gap-2">
      <label class="label" for="new-password">{{ $t('auth.credential.newPassword') }}</label>
      <password-input id="new-password" v-model="password" autocomplete="new-password" :is-disabled="isSubmitting" />
      <p class="body-two">{{ $t('auth.credential.passwordRule', { length: PASSWORD_MIN_LENGTH }) }}</p>
    </div>
    <div class="flex flex-col gap-2">
      <label class="label" for="confirm-password">{{ $t('auth.credential.confirmPassword') }}</label>
      <password-input
        id="confirm-password"
        v-model="passwordConfirmation"
        autocomplete="new-password"
        :is-disabled="isSubmitting"
      />
    </div>
    <p v-if="localError" class="form-error" role="alert">{{ localError }}</p>
    <button type="submit" class="btn-primary w-full" :disabled="isSubmitting">
      {{ submitLabel }}
      <arrow-right-line-icon class="h-4 w-4" />
    </button>
  </form>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { PASSWORD_MIN_LENGTH, PIN_LENGTH } from 'auth/constants/auth';
import type { CredentialKind } from 'auth/types/auth';

import PinPad from 'auth/components/pin-pad.vue';
import PasswordInput from 'auth/components/password-input.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// props
defineProps<{ kind: CredentialKind; submitLabel: string; isSubmitting?: boolean }>();

// emits
const emit = defineEmits<{ (event: 'submit', secret: string): void }>();

// stores
const { t } = useI18n();

// variables
const pin = ref('');
const firstPin = ref('');
const isConfirming = ref(false);
const password = ref('');
const passwordConfirmation = ref('');
const localError = ref('');

// methods
const isWeakPin = (value: string): boolean => /^(\d)\1+$/.test(value) || '0123456789'.includes(value);

// event handlers
const handlePinComplete = (value: string): void => {
  localError.value = '';
  if (!isConfirming.value) {
    if (isWeakPin(value)) {
      localError.value = t('auth.credential.weakPin');
      pin.value = '';
      return;
    }
    firstPin.value = value;
    isConfirming.value = true;
    pin.value = '';
    return;
  }
  if (value !== firstPin.value) {
    localError.value = t('auth.credential.pinMismatch');
    isConfirming.value = false;
    pin.value = '';
    return;
  }
  emit('submit', value);
};

const handlePasswordSubmit = (): void => {
  localError.value = '';
  if (password.value.length < PASSWORD_MIN_LENGTH) {
    localError.value = t('auth.credential.passwordRule', { length: PASSWORD_MIN_LENGTH });
    return;
  }
  if (password.value !== passwordConfirmation.value) {
    localError.value = t('auth.credential.passwordMismatch');
    return;
  }
  emit('submit', password.value);
};
</script>
