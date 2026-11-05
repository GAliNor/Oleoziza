<template>
  <section class="flex flex-col gap-2">
    <h2 class="label">{{ $t('reception.notification.title') }}</h2>
    <div class="grid grid-cols-3 gap-2" role="radiogroup" :aria-label="$t('reception.notification.title')">
      <button
        v-for="choice in NOTIFICATION_CHOICES"
        :key="choice"
        type="button"
        role="radio"
        class="toggle-tile"
        :class="{ 'toggle-tile-active': modelValue === choice }"
        :aria-checked="modelValue === choice"
        @click="emit('update:modelValue', choice)"
      >
        {{ $t(`reception.notification.${choice}`) }}
      </button>
    </div>
    <p v-if="isUnchecked" class="rounded-control bg-warning-subtle p-2 body-two text-fg-warning" role="status">{{ $t('reception.notification.offline') }}</p>
    <ui-field v-else-if="isContactMissing" v-slot="{ id }" :label="$t(`reception.notification.missing.${modelValue}`)">
      <input
        :id="id"
        :value="contact"
        class="input"
        :type="modelValue === 'email' ? 'email' : 'tel'"
        :inputmode="modelValue === 'email' ? 'email' : 'tel'"
        @input="emit('update:contact', ($event.target as HTMLInputElement).value)"
      />
    </ui-field>
  </section>
</template>

<script setup lang="ts">
// imports
import { NOTIFICATION_CHOICES } from 'reception/constants/reception';
import type { NotificationChoice } from 'lot/types/lot';

import UiField from 'global/components/ui-field.vue';

// props
defineProps<{ modelValue: NotificationChoice | null; contact: string; isContactMissing: boolean; isUnchecked: boolean }>();

// emits
const emit = defineEmits<{
  (event: 'update:modelValue', choice: NotificationChoice): void;
  (event: 'update:contact', contact: string): void;
}>();
</script>
