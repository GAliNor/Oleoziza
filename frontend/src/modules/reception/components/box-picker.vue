<template>
  <section class="flex flex-col gap-3">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="label">{{ $t('reception.box.title') }}</h2>
      <p class="body-three tabular-nums">{{ $t('reception.box.free', { free: freeBoxes.length, total: boxCount }) }}</p>
    </div>

    <div class="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-card px-4 py-3 transition-colors duration-300 ease-(--ease-premium)" :class="STATUS_TONES[status.tone]" role="status">
      <p class="min-w-0">
        <span class="block text-sm font-semibold text-fg-display">{{ status.title }}</span>
        <span class="body-three block">{{ status.detail }}</span>
      </p>
      <button v-if="canRestoreSuggestion" type="button" class="link shrink-0" @click="handleUseSuggestion">{{ $t('reception.box.useSuggestion') }}</button>
    </div>

    <ul class="grid grid-cols-6 gap-2 sm:grid-cols-8">
      <li v-for="box in boxes" :key="box">
        <button
          type="button"
          class="box-tile relative"
          :class="boxClass(box)"
          :disabled="occupancy.has(box)"
          :aria-pressed="modelValue.includes(box)"
          :aria-label="boxLabel(box)"
          :title="boxLabel(box)"
          @click="handleToggle(box)"
        >
          {{ box }}
          <check-line-icon v-if="modelValue.includes(box)" class="check-pop absolute top-0.5 inset-e-0.5 h-3.5 w-3.5" />
        </button>
      </li>
    </ul>

    <ul class="body-three flex flex-wrap gap-x-4 gap-y-1" aria-hidden="true">
      <li v-for="item in LEGEND" :key="item.key" class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm border" :class="item.swatch" />
        {{ $t(`reception.box.legend.${item.key}`) }}
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { areSideBySide, boxesNeeded, formatBoxes, suggestBoxes } from 'lot/composables/lot-boxes';
import { formatKg } from 'lot/composables/quantity';
import type { ILot } from 'lot/types/lot';

import CheckLineIcon from 'global/icons/check-line.icon.vue';

// props
const props = defineProps<{ modelValue: number[]; boxCount: number; capacityKg: number; netKg: number; occupancy: Map<number, ILot> }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', boxes: number[]): void }>();

// stores
const { t } = useI18n();

// variables
type StatusTone = 'neutral' | 'suggested' | 'warning' | 'danger';
const STATUS_TONES: Record<StatusTone, string> = {
  neutral: 'bg-subtle',
  suggested: 'bg-selected/50',
  warning: 'bg-warning-subtle',
  danger: 'bg-danger-subtle',
};
const LEGEND = [
  { key: 'free', swatch: 'border-strong bg-surface' },
  { key: 'selected', swatch: 'border-brand bg-action' },
  { key: 'occupied', swatch: 'border-default bg-emphasis' },
];
const isManual = ref(false);

// computed
const boxes = computed((): number[] => Array.from({ length: props.boxCount }, (_, index) => index + 1));
const freeBoxes = computed((): number[] => boxes.value.filter((box) => !props.occupancy.has(box)));
const needed = computed((): number => boxesNeeded(props.netKg, props.capacityKg));
const suggestion = computed((): number[] => suggestBoxes(freeBoxes.value, needed.value));
const canRestoreSuggestion = computed((): boolean => isManual.value && suggestion.value.length > 0 && suggestion.value.join() !== props.modelValue.join());
const status = computed((): { tone: StatusTone; title: string; detail: string } => {
  const selected = props.modelValue;
  const room = formatKg(selected.length * props.capacityKg);
  const weight = formatKg(props.netKg);
  if (!freeBoxes.value.length && !selected.length) return { tone: 'danger', title: t('reception.box.noneFree'), detail: t('reception.box.noneFreeDetail') };
  if (!needed.value && !selected.length) return { tone: 'neutral', title: t('reception.box.waitingWeight'), detail: t('reception.box.waitingWeightDetail', { capacity: formatKg(props.capacityKg) }) };
  if (selected.length < needed.value) {
    return { tone: 'warning', title: t('reception.box.short', { count: needed.value - selected.length }), detail: t('reception.box.shortDetail', { room, weight }) };
  }
  const detail = needed.value ? t('reception.box.fits', { room, weight }) : t('reception.box.room', { room });
  if (isManual.value) return { tone: 'neutral', title: t('reception.box.chosen', { boxes: formatBoxes(selected) }), detail };
  return {
    tone: 'suggested',
    title: t('reception.box.suggested', { boxes: formatBoxes(selected) }),
    detail: areSideBySide(selected) ? detail : `${detail} · ${t('reception.box.notSideBySide')}`,
  };
});

// watchers
watch(suggestion, (next) => {
  if (!isManual.value) emit('update:modelValue', next);
});

// methods
const boxClass = (box: number): string => {
  if (props.occupancy.has(box)) return 'box-tile-taken';
  return props.modelValue.includes(box) ? 'box-tile-active' : '';
};

const boxLabel = (box: number): string => {
  const holder = props.occupancy.get(box);
  return holder ? t('reception.box.occupiedBy', { box, client: holder.clientName, code: holder.code }) : t('reception.box.freeBox', { box });
};

// event handlers
const handleToggle = (box: number): void => {
  isManual.value = true;
  const next = props.modelValue.includes(box) ? props.modelValue.filter((item) => item !== box) : [...props.modelValue, box];
  emit('update:modelValue', next.sort((first, second) => first - second));
};

const handleUseSuggestion = (): void => {
  isManual.value = false;
  emit('update:modelValue', suggestion.value);
};
</script>
