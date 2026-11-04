<template>
  <section class="flex flex-col gap-5">
    <button type="button" class="btn-secondary min-h-14 self-start" @click="emit('close')">
      <arrow-left-line-icon class="h-5 w-5" />
      {{ backLabel }}
    </button>

    <div class="flex flex-col items-center gap-2 text-center">
      <ui-avatar class="h-24 w-24" :name="lot.clientName" :variant="avatarVariant" />
      <p class="body-two">{{ $t('dashboard.operator.confirm.youWill') }}</p>
      <h2 class="heading-two">{{ $t(`lot.move.${lot.status}`) }}</h2>
      <p class="text-lg text-fg-default">{{ $t('dashboard.operator.confirm.forClient') }} <strong>{{ lot.clientName }}</strong></p>
      <p class="body-two">{{ lot.variety }} · {{ formatKg(lot.netKg) }} · {{ lot.code }}</p>
    </div>

    <div class="flex items-center justify-center gap-3 text-sm font-medium">
      <span class="rounded-full bg-subtle px-3 py-1.5 text-fg-primary-paragraph">{{ $t(`lot.status.${lot.status}`) }}</span>
      <span aria-hidden="true">→</span>
      <span class="rounded-full bg-action px-3 py-1.5 text-fg-on-action">{{ nextLabel }}</span>
    </div>

    <label v-if="lot.status === 'pressing'" class="flex flex-col gap-1">
      <span class="label">{{ $t('dashboard.operator.confirm.oil') }}</span>
      <input v-model.number="oilKg" class="input text-display-xs font-semibold" type="number" inputmode="decimal" min="0" />
    </label>

    <ui-photo-capture v-model="photo" :label="$t('dashboard.operator.confirm.photo')" />

    <div class="grid grid-cols-2 gap-3">
      <button type="button" class="btn-secondary min-h-16 text-md" @click="emit('close')">{{ $t('dashboard.operator.confirm.no') }}</button>
      <button type="button" class="btn-primary min-h-16 text-md" :disabled="isDisabled" @click="handleConfirm">{{ $t('dashboard.operator.confirm.yes') }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';

import { useLotStore } from 'lot/stores/lot';
import { createId } from 'global/composables/crypto';
import type { AvatarVariant } from 'global/types/avatar';
import type { ILot, ILotMove } from 'lot/types/lot';
import { formatKg } from 'lot/composables/quantity';

import UiAvatar from 'global/components/ui-avatar.vue';
import UiPhotoCapture from 'global/components/ui-photo-capture.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';

// props
const props = defineProps<{ lot: ILot; avatarVariant: AvatarVariant; nextLabel: string; backLabel: string }>();

// emits
const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm', lot: ILot, move: ILotMove): void;
}>();

// stores
const lotStore = useLotStore();

// variables
const oilKg = ref<number | null>(null);
const moveId = ref(createId());
const photo = ref<string | null>(null);

// computed
const isDisabled = computed((): boolean => lotStore.isSaving || (props.lot.status === 'pressing' && !oilKg.value));

// watchers
watch(
  () => props.lot.id,
  () => {
    oilKg.value = null;
    photo.value = null;
    moveId.value = createId();
  },
);

// event handlers
const handleConfirm = (): void => {
  emit('confirm', props.lot, { id: moveId.value, oilKg: oilKg.value ?? undefined, photoUrl: photo.value ?? undefined });
};
</script>
