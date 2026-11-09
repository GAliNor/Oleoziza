<template>
  <form class="flex flex-col gap-3 rounded-card bg-subtle p-4" @submit.prevent="handleSave">
    <h3 class="label">{{ $t('lot.schedule.title') }}</h3>
    <div class="grid gap-2" :class="lines.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
      <button v-for="line in lines" :key="line.id" type="button" class="toggle-tile flex flex-col items-start text-start" :class="{ 'toggle-tile-active': pressLineId === line.id }" @click="pressLineId = line.id">
        <span class="font-semibold">{{ formatPressLine(line) }}</span>
        <span class="body-two">{{ $t('lot.schedule.queue', { count: lineQueue(siteLots, line.id).filter((item) => item.id !== lot.id).length }) }}</span>
      </button>
    </div>
    <ui-field v-slot="{ id }" :label="$t('lot.schedule.plannedStart')">
      <input :id="id" v-model="startTyped" class="input" type="datetime-local" />
    </ui-field>
    <div class="grid grid-cols-2 gap-2">
      <button type="button" class="btn-secondary" @click="emit('close')">{{ $t('lot.schedule.cancel') }}</button>
      <button type="submit" class="btn-primary" :disabled="!canSave">{{ $t('lot.schedule.save') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useLotStore } from 'lot/stores/lot';
import { useToastStore } from 'global/stores/toast';
import { createId } from 'global/composables/crypto';
import { fromDateTimeInput, toDateTimeInput } from 'global/composables/datetime-input';
import { formatPressLine } from 'configuration/composables/equipment';
import { lineQueue } from 'lot/composables/press-schedule';
import type { IPressLineSetting } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';

import UiField from 'global/components/ui-field.vue';

// props
const props = defineProps<{ lot: ILot; lines: IPressLineSetting[] }>();

// emits
const emit = defineEmits<{ (event: 'close'): void }>();

// stores
const { t } = useI18n();
const lotStore = useLotStore();
const toastStore = useToastStore();

// variables
const scheduleId = createId();
const pressLineId = ref(props.lot.pressLineId ?? props.lines[0]?.id ?? '');
const startTyped = ref(props.lot.plannedStartAt ? toDateTimeInput(props.lot.plannedStartAt) : '');

// computed
const siteLots = computed((): ILot[] => lotStore.lots.filter((item) => item.siteId === props.lot.siteId));
const plannedStartAt = computed((): string => fromDateTimeInput(startTyped.value));
const canSave = computed((): boolean => !!pressLineId.value && !!plannedStartAt.value && !lotStore.isSaving);

// event handlers
const handleSave = async (): Promise<void> => {
  if (!canSave.value) return;
  const updated = await lotStore.scheduleLot(props.lot, { id: scheduleId, pressLineId: pressLineId.value, plannedStartAt: plannedStartAt.value });
  if (!updated) {
    toastStore.push(t('lot.schedule.error'), 'danger');
    return;
  }
  toastStore.push(t('lot.schedule.saved', { code: updated.code }), 'success');
  emit('close');
};
</script>
