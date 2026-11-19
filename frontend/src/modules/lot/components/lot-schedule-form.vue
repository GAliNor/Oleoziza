<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSave">
    <h3 :id="titleId" class="label">{{ $t('lot.schedule.title') }}</h3>
    <div class="overflow-hidden rounded-card border border-default bg-surface shadow-raised">
      <div role="radiogroup" :aria-labelledby="titleId">
        <button
          v-for="(line, index) in lines"
          :key="line.id"
          type="button"
          role="radio"
          :aria-checked="pressLineId === line.id"
          class="relative flex min-h-18 w-full items-center gap-3 px-4 py-3 text-start transition-colors duration-200 ease-(--ease-premium)
            hover:bg-subtle focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          :class="[{ 'border-t border-default': index }, pressLineId === line.id ? 'bg-selected/35 hover:bg-selected/35' : '']"
          @click="pressLineId = line.id"
        >
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-md font-semibold tabular-nums transition-colors duration-300 ease-(--ease-premium)"
            :class="pressLineId === line.id ? 'bg-action text-fg-on-action' : 'bg-subtle text-fg-display'"
            aria-hidden="true"
          >
            {{ line.number }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold text-fg-display">{{ line.name || formatPressLine(line) }}</span>
            <span class="block body-two text-fg-primary-paragraph">{{ $t('lot.schedule.queue', { count: queueCount(line.id) }) }}</span>
          </span>
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200"
            :class="pressLineId === line.id ? 'border-action bg-action text-fg-on-action' : 'border-strong'"
            aria-hidden="true"
          >
            <check-line-icon v-if="pressLineId === line.id" class="check-pop h-3.5 w-3.5" />
          </span>
        </button>
      </div>
      <div class="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-default px-4 py-2">
        <label :for="startId" class="shrink-0 text-sm font-medium whitespace-nowrap text-fg-primary-paragraph">{{ $t('lot.schedule.plannedStart') }}</label>
        <ui-date-picker :id="startId" v-model="startTyped" class="w-full max-w-64 min-w-0" mode="datetime" :label="$t('lot.schedule.plannedStart')" />
      </div>
      <div v-if="pressLineId" class="border-t border-default px-4 py-3">
        <button type="button" class="link" @click="handleFirst">{{ $t('lot.schedule.first') }}</button>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <button type="button" class="btn-secondary" @click="emit('close')">{{ $t('lot.schedule.cancel') }}</button>
      <button type="submit" class="btn-primary" :disabled="!canSave">{{ $t('lot.schedule.save') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';

import { useLotStore } from 'lot/stores/lot';
import { useToastStore } from 'global/stores/toast';
import { createId } from 'global/composables/crypto';
import { fromDateTimeInput, toDateTimeInput } from 'global/composables/datetime-input';
import { formatPressLine } from 'configuration/composables/equipment';
import { firstStart, lineQueue } from 'lot/composables/press-schedule';
import type { IPressLineSetting } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';

import UiDatePicker from 'global/components/ui-date-picker.vue';
import CheckLineIcon from 'global/icons/check-line.icon.vue';

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
const titleId = useId();
const startId = useId();
const pressLineId = ref(props.lot.pressLineId ?? props.lines[0]?.id ?? '');
const startTyped = ref(props.lot.plannedStartAt ? toDateTimeInput(props.lot.plannedStartAt) : '');

// computed
const siteLots = computed((): ILot[] => lotStore.lots.filter((item) => item.siteId === props.lot.siteId));
const plannedStartAt = computed((): string => fromDateTimeInput(startTyped.value));
const canSave = computed((): boolean => !!pressLineId.value && !!plannedStartAt.value && !lotStore.isSaving);

// methods
const queueCount = (lineId: string): number => lineQueue(siteLots.value, lineId).filter((item) => item.id !== props.lot.id).length;

// event handlers
const handleFirst = (): void => {
  startTyped.value = toDateTimeInput(firstStart(siteLots.value, pressLineId.value, props.lot.id, new Date()));
};

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
