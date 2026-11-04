<template>
  <form class="flex flex-col gap-5" @submit.prevent="emit('submit')">
    <ui-field v-slot="{ id }" :label="$t('auth.login.identifier')">
      <input
        :id="id"
        v-model="identifier"
        class="input"
        type="text"
        inputmode="email"
        autocomplete="username"
        :placeholder="$t('auth.login.identifierPlaceholder')"
        :disabled="isLoading"
      />
    </ui-field>
    <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
    <button type="submit" class="btn-primary w-full" :disabled="isLoading || !identifier.trim()">
      {{ submitLabel }}
      <arrow-right-line-icon class="h-4 w-4" />
    </button>
  </form>
</template>

<script setup lang="ts">
// imports
import UiField from 'global/components/ui-field.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// props
defineProps<{ submitLabel: string; isLoading: boolean; errorMessage: string }>();

// emits
const emit = defineEmits<{ submit: [] }>();

// variables
const identifier = defineModel<string>({ required: true });
</script>
