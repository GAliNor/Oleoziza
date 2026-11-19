<template>
  <section class="flex flex-col gap-2">
    <h2 class="label">{{ $t('reception.notification.title') }}</h2>
    <ui-segmented
      is-full
      is-choice
      :model-value="modelValue"
      :options="choiceOptionsComputed"
      :label="$t('reception.notification.title')"
      @update:model-value="emit('update:modelValue', $event)"
    />
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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { NotificationChoice } from 'lot/types/lot';
import type { NotificationChannel } from 'configuration/types/configuration';

import UiField from 'global/components/ui-field.vue';
import UiSegmented from 'global/components/ui-segmented.vue';

// props
const props = defineProps<{
  modelValue: NotificationChoice | null;
  contact: string;
  isContactMissing: boolean;
  isUnchecked: boolean;
  /** The channels Management enabled; « Aucune » is always offered after them. */
  channels: NotificationChannel[];
}>();

// emits
const emit = defineEmits<{
  (event: 'update:modelValue', choice: NotificationChoice): void;
  (event: 'update:contact', contact: string): void;
}>();

// stores
const { t } = useI18n();

// computed
const choiceOptionsComputed = computed((): { key: NotificationChoice; label: string }[] =>
  [...props.channels, 'none' as const].map((choice) => ({ key: choice, label: t(`reception.notification.${choice}`) })),
);
</script>
