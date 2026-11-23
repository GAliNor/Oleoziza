<template>
  <section class="flex flex-col gap-2">
    <h2 :id="titleId" class="label">{{ $t('reception.line.title') }}</h2>
    <div
      class="overflow-hidden rounded-card border border-default bg-surface shadow-raised"
      role="radiogroup"
      :aria-labelledby="titleId"
      @keydown="handleKeydown"
    >
      <button
        v-for="(line, index) in lines"
        :key="line.id"
        :ref="(element) => setRow(line.id, element as HTMLButtonElement | null)"
        type="button"
        role="radio"
        :aria-checked="pressLineId === line.id"
        :tabindex="pressLineId === line.id || (!pressLineId && index === 0) ? 0 : -1"
        class="relative flex min-h-18 w-full items-center gap-3 px-4 py-3 text-start transition-colors duration-200 ease-(--ease-premium)
          hover:bg-subtle focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        :class="[{ 'border-t border-default': index }, pressLineId === line.id ? 'bg-selected/35 hover:bg-selected/35' : '']"
        @click="handlePickLine(line.id)"
      >
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-md font-semibold tabular-nums transition-colors duration-300 ease-(--ease-premium)"
          :class="pressLineId === line.id ? 'bg-action text-fg-on-action' : 'bg-subtle text-fg-display'"
          aria-hidden="true"
        >
          {{ line.number }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex min-w-0 items-center gap-2">
            <span class="truncate font-semibold text-fg-display">{{ line.name || formatPressLine(line) }}</span>
            <span v-if="suggestedComputed?.id === line.id" class="shrink-0 text-xs font-semibold text-fg-brand">{{ $t('reception.line.suggested') }}</span>
          </span>
          <span class="block body-two text-fg-primary-paragraph">{{ queueSentence(line) }}</span>
        </span>
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200"
          :class="pressLineId === line.id ? 'border-action bg-action text-fg-on-action' : 'border-strong'"
          aria-hidden="true"
        >
          <check-line-icon v-if="pressLineId === line.id" class="check-pop h-3.5 w-3.5" />
        </span>
      </button>

      <button
        :ref="(element) => setRow(LATER, element as HTMLButtonElement | null)"
        type="button"
        role="radio"
        :aria-checked="isLater"
        :tabindex="isLater || !lines.length ? 0 : -1"
        class="relative flex min-h-18 w-full items-center gap-3 border-default px-4 py-3 text-start transition-colors duration-200 ease-(--ease-premium) hover:bg-subtle focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        :class="[{ 'border-t': lines.length }, isLater ? 'bg-selected/35 hover:bg-selected/35' : '']"
        @click="pickLater"
      >
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ease-(--ease-premium)" :class="isLater ? 'bg-action text-fg-on-action' : 'bg-subtle text-fg-display'" aria-hidden="true">
          <clock-line-icon class="h-5 w-5" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block font-semibold text-fg-display">{{ $t('reception.line.later') }}</span>
          <span class="block body-two text-fg-primary-paragraph">{{ $t('reception.line.laterHint') }}</span>
        </span>
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200" :class="isLater ? 'border-action bg-action text-fg-on-action' : 'border-strong'" aria-hidden="true">
          <check-line-icon v-if="isLater" class="check-pop h-3.5 w-3.5" />
        </span>
      </button>

      <div v-if="!isLater" class="flex min-h-14 items-center justify-between gap-3 border-t border-default px-4 py-1.5">
        <label :for="startId" class="shrink-0 text-sm font-medium whitespace-nowrap text-fg-primary-paragraph">{{ $t('reception.line.plannedStart') }}</label>
        <ui-date-picker :id="startId" v-model="startTyped" class="w-full max-w-64 min-w-0" mode="datetime" :label="$t('reception.line.plannedStart')" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatPressLine } from 'configuration/composables/equipment';
import { fromDateTimeInput, toDateTimeInput } from 'global/composables/datetime-input';
import { formatDateTime, formatTime, toIsoDate, todayIso } from 'global/composables/date';
import { lineQueue, suggestLine, suggestStart } from 'lot/composables/press-schedule';
import type { IPressLineSetting } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';

import UiDatePicker from 'global/components/ui-date-picker.vue';
import CheckLineIcon from 'global/icons/check-line.icon.vue';
import ClockLineIcon from 'global/icons/clock-line.icon.vue';

// props
const props = defineProps<{ lines: IPressLineSetting[]; lots: ILot[] }>();

// emits
const pressLineId = defineModel<string>('line', { required: true });
const plannedStartAt = defineModel<string>('start', { required: true });
const isLater = defineModel<boolean>('later', { required: true });

// stores
const { t } = useI18n();

// variables
const titleId = useId();
const startId = useId();
const LATER = 'later';
const isStartTyped = ref(false);
const rows = new Map<string, HTMLButtonElement>();

// computed
const startTyped = computed({
  get: (): string => (plannedStartAt.value ? toDateTimeInput(plannedStartAt.value) : ''),
  set: (value: string): void => {
    isStartTyped.value = true;
    plannedStartAt.value = fromDateTimeInput(value);
  },
});
const suggestedComputed = computed((): IPressLineSetting | null => suggestLine(props.lines, props.lots));

// watchers
watch(
  () => props.lines.map((line) => line.id).join(),
  () => {
    if (!props.lines.length) isLater.value = true;
    if (isLater.value || props.lines.some((line) => line.id === pressLineId.value)) return;
    pressLineId.value = suggestedComputed.value?.id ?? '';
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

// methods
const setRow = (id: string, element: HTMLButtonElement | null): void => {
  if (element) rows.set(id, element);
  else rows.delete(id);
};

const slotLabel = (at: string): string => (toIsoDate(at) === todayIso() ? formatTime(at) : formatDateTime(at));

const queueSentence = (line: IPressLineSetting): string => {
  const count = lineQueue(props.lots, line.id).length;
  if (!count) return t('reception.line.freeNow');
  return t('reception.line.queueFrom', { queue: t('reception.line.queue', count), at: slotLabel(suggestStart(props.lots, line.id, new Date())) });
};

const pickLine = (lineId: string): void => {
  isLater.value = false;
  pressLineId.value = lineId;
};

/** Leaves the Press Line and the hour for later: the Lot waits with the others, without one. */
const pickLater = (): void => {
  isLater.value = true;
  pressLineId.value = '';
  plannedStartAt.value = '';
  isStartTyped.value = false;
};

const pickAt = (index: number): void => {
  const count = props.lines.length + 1;
  const line = props.lines[(index + count) % count];
  if (line) pickLine(line.id);
  else pickLater();
  rows.get(line?.id ?? LATER)?.focus();
};

// event handlers
const handlePickLine = (lineId: string): void => pickLine(lineId);

const handleKeydown = (event: KeyboardEvent): void => {
  const current = isLater.value ? props.lines.length : props.lines.findIndex((line) => line.id === pressLineId.value);
  const steps: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
  if (!(event.key in steps) || (event.target as HTMLElement).tagName === 'INPUT') return;
  event.preventDefault();
  pickAt(current + steps[event.key]);
};

</script>
