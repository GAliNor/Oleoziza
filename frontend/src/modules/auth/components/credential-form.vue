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

  <form v-else :ref="setFormRoot" class="flex flex-col gap-5" novalidate @submit.prevent="attempt(() => emit('submit', password))">
    <ui-field v-slot="{ id }" name="password" :label="$t('auth.credential.newPassword')" :error="errorOf('password')" :is-valid="isValid('password')" :hint="$t('auth.credential.passwordRule', { length: PASSWORD_MIN_LENGTH })" @leave="touch('password')">
      <password-input :id="id" v-model="password" autocomplete="new-password" :is-disabled="isSubmitting" />
    </ui-field>
    <ui-field v-slot="{ id }" name="confirmation" :label="$t('auth.credential.confirmPassword')" :error="errorOf('confirmation')" :is-valid="isValid('confirmation')" @leave="touch('confirmation')">
      <password-input
        :id="id"
        v-model="passwordConfirmation"
        autocomplete="new-password"
        :is-disabled="isSubmitting"
      />
    </ui-field>
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

import { useFormFeedback } from 'global/composables/use-form-feedback';
import { PASSWORD_MIN_LENGTH, PIN_LENGTH } from 'auth/constants/auth';
import type { CredentialKind } from 'auth/types/auth';

import UiField from 'global/components/ui-field.vue';
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

const { setFormRoot, errorOf, isValid, touch, attempt } = useFormFeedback(() => [
  { key: 'password', label: t('auth.credential.newPassword'), isMissing: !password.value, error: password.value.length < PASSWORD_MIN_LENGTH ? t('auth.credential.passwordRule', { length: PASSWORD_MIN_LENGTH }) : null, isFilled: true },
  { key: 'confirmation', label: t('auth.credential.confirmPassword'), isMissing: !passwordConfirmation.value, error: password.value === passwordConfirmation.value ? null : t('auth.credential.passwordMismatch'), isFilled: true },
]);

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
</script>
