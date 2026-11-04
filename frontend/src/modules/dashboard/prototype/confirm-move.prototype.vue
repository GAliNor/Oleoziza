<template>
  <section class="flex flex-col gap-5">
    <button type="button" class="link self-start" @click="emit('close')">← Retour à la liste</button>

    <div class="flex flex-col items-center gap-2 text-center">
      <ui-avatar class="h-24 w-24" :name="lot.client" :variant="avatarVariant" />
      <p class="body-two">Vous allez</p>
      <h2 class="heading-two">{{ MOVE_LABELS[lot.status] }}</h2>
      <p class="text-lg text-fg-default">pour <strong>{{ lot.client }}</strong></p>
      <p class="body-two">{{ lot.variety }} · {{ formatKg(lot.netKg) }} · {{ lot.code }}</p>
    </div>

    <div class="flex items-center justify-center gap-3 text-sm font-medium">
      <span class="rounded-full bg-subtle px-3 py-1.5 text-fg-primary-paragraph">{{ STATUS_LABELS[lot.status] }}</span>
      <span aria-hidden="true">→</span>
      <span class="rounded-full bg-action px-3 py-1.5 text-fg-on-action">{{ nextLabel }}</span>
    </div>

    <label v-if="lot.status === 'pressing'" class="flex flex-col gap-1">
      <span class="label">Huile obtenue (kg)</span>
      <input v-model.number="oilKg" class="input text-display-xs font-semibold" type="number" inputmode="decimal" min="0" />
    </label>

    <div class="grid grid-cols-2 gap-2">
      <button type="button" class="btn-secondary min-h-16 text-md" @click="emit('close')">Non</button>
      <button type="button" class="btn-primary min-h-16 text-md" :disabled="lot.status === 'pressing' && !oilKg" @click="handleConfirm">Oui, c’est ça</button>
    </div>
  </section>
</template>

<script setup lang="ts">
// PROTOTYPE — inline "are you sure" panel restating the move; slides in in place of the list (ticket 0037).
// imports
import { ref, watch } from 'vue';

import { STATUS_LABELS, type ILotPrototype } from 'dashboard/prototype/mock-home.prototype';
import { MOVE_LABELS } from 'dashboard/prototype/use-operator-desk.prototype';
import type { AvatarVariant } from 'global/types/avatar';
import { formatKg } from 'lot/composables/quantity';

import UiAvatar from 'global/components/ui-avatar.vue';

// props
const props = defineProps<{ lot: ILotPrototype; avatarVariant: AvatarVariant; nextLabel: string }>();
const emit = defineEmits<{ close: []; confirm: [lot: ILotPrototype, oilKg?: number] }>();

// variables
const oilKg = ref<number | null>(null);

// watchers
watch(
  () => props.lot,
  () => {
    oilKg.value = null;
  },
);

// event handlers
const handleConfirm = (): void => {
  emit('confirm', props.lot, oilKg.value ?? undefined);
};
</script>
