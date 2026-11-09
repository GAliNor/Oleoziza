<template>
  <section class="flex flex-col gap-2">
    <h2 class="label">{{ $t('reception.line.title') }}</h2>
    <div class="grid gap-2" :class="lines.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
      <button
        v-for="line in lines"
        :key="line.id"
        type="button"
        class="toggle-tile flex flex-col items-start gap-0.5 text-start"
        :class="{ 'toggle-tile-active': pressLineId === line.id }"
        @click="handlePickLine(line.id)"
      >
        <span class="font-semibold">{{ formatPressLine(line) }}</span>
        <span class="body-two">{{ $t('reception.line.queue', { count: lineQueue(lots, line.id).length }) }}</span>
        <span v-if="suggested?.id === line.id" class="chip mt-1 bg-selected text-fg-brand">{{ $t('reception.line.suggested') }}</span>
      </button>
    </div>
    <ui-field v-slot="{ id }" :label="$t('reception.line.plannedStart')">
      <input :id="id" class="input" type="datetime-local" :value="plannedStartAt ? toDateTimeInput(plannedStartAt) : ''" @input="handleStart" />
    </ui-field>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';

import { formatPressLine } from 'configuration/composables/equipment';
import { fromDateTimeInput, toDateTimeInput } from 'global/composables/datetime-input';
import { lineQueue, suggestLine, suggestStart } from 'lot/composables/press-schedule';
import type { IPressLineSetting } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';

import UiField from 'global/components/ui-field.vue';

// props
const props = defineProps<{ lines: IPressLineSetting[]; lots: ILot[] }>();

// variables
const pressLineId = defineModel<string>('line', { required: true });
const plannedStartAt = defineModel<string>('start', { required: true });
const isStartTyped = ref(false);

// computed
const suggested = computed((): IPressLineSetting | null => suggestLine(props.lines, props.lots));

// watchers
watch(
  () => props.lines.map((line) => line.id).join(),
  () => {
    if (props.lines.some((line) => line.id === pressLineId.value)) return;
    pressLineId.value = suggested.value?.id ?? '';
    isStartTyped.value = false;
  },
  { immediate: true },
);

watch(
  pressLineId,
  (lineId) => {
    if (lineId && !isStartTyped.value) plannedStartAt.value = suggestStart(props.lots, lineId, new Date());
  },
  { immediate: true },
);

// event handlers
const handlePickLine = (lineId: string): void => {
  pressLineId.value = lineId;
};

const handleStart = (event: Event): void => {
  isStartTyped.value = true;
  plannedStartAt.value = fromDateTimeInput((event.target as HTMLInputElement).value);
};
</script>
