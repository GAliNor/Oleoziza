<template>
  <form :ref="setFormRoot" class="flex flex-col gap-5" novalidate @submit.prevent="attempt(() => emit('submit'))">
    <ui-field v-slot="{ id, describedBy, isInvalid }" name="identifier" :label="$t('auth.login.identifier')" :error="errorOf('identifier')">
      <input
        :id="id"
        v-model="identifier"
        class="input"
        type="text"
        inputmode="email"
        autocomplete="username"
        :placeholder="$t('auth.login.identifierPlaceholder')"
        :disabled="isLoading"
        :aria-invalid="isInvalid"
        :aria-describedby="describedBy"
      />
    </ui-field>
    <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
    <button type="submit" class="btn-primary w-full" :disabled="isLoading">
      {{ submitLabel }}
      <arrow-right-line-icon class="h-4 w-4" />
    </button>
  </form>
</template>

<script setup lang="ts">
// imports
import { useI18n } from 'vue-i18n';

import { useFormFeedback } from 'global/composables/use-form-feedback';

import UiField from 'global/components/ui-field.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// props
defineProps<{ submitLabel: string; isLoading: boolean; errorMessage: string }>();

// emits
const emit = defineEmits<{ (event: 'submit'): void }>();

// variables
const { t } = useI18n();
const identifier = defineModel<string>({ required: true });
const { setFormRoot, errorOf, attempt } = useFormFeedback(() => [{ key: 'identifier', label: t('auth.login.identifier'), isMissing: !identifier.value.trim() }]);
</script>
