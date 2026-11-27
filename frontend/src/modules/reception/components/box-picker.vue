<template>
  <section class="flex flex-col gap-3">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="label">{{ $t('reception.box.title') }}</h2>
      <p class="body-three tabular-nums">{{ $t('reception.box.free', { free: freeBoxes.length, total: boxCount }) }}</p>
    </div>

    <div
      ref="statusBox"
      class="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-card px-4 py-3 transition-colors duration-500 ease-(--ease-premium)"
      :class="STATUS_TONES[status.tone]"
      role="status"
    >
      <div class="relative min-w-0 flex-1">
        <Transition name="status-swap">
          <p :key="status.key" class="min-w-0">
            <span class="block text-sm font-semibold text-fg-display">{{ status.title }}</span>
            <span class="body-three block">{{ status.detail }}</span>
          </p>
        </Transition>
      </div>
      <Transition name="status-action">
        <button v-if="canRestoreSuggestion" type="button" class="link shrink-0" @click="handleUseSuggestion">{{ $t('reception.box.useSuggestion') }}</button>
      </Transition>
    </div>

    <ui-segmented
      v-if="rangesComputed.length > 1"
      :model-value="rangeKey"
      :options="rangeOptionsComputed"
      :label="$t('reception.box.rangeLabel')"
      @update:model-value="handleRange"
    >
      <template #option="{ option }">
        <span class="flex flex-col items-center leading-tight">
          <span class="flex items-center gap-1 tabular-nums">
            {{ option.label }}
            <span v-if="rangeHasChosen(option.key)" class="h-1.5 w-1.5 rounded-full bg-action" :aria-label="$t('reception.box.rangeHasChosen')" />
          </span>
          <span class="text-xs font-normal text-fg-secondary-paragraph tabular-nums">{{ $t('reception.box.rangeFree', option.count ?? 0) }}</span>
        </span>
      </template>
    </ui-segmented>

    <div ref="pageBox" class="relative">
      <Transition :name="isPagingBack ? 'box-page-back' : 'box-page'">
        <ul :key="rangeKey" class="grid gap-2" :class="rangesComputed.length > 1 ? 'grid-cols-5 sm:grid-cols-10' : 'grid-cols-6 sm:grid-cols-8'">
          <li v-for="(box, index) in visibleBoxesComputed" :key="box" :style="{ '--tile': index }">
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
      </Transition>
    </div>

    <ul class="body-three flex flex-wrap gap-x-4 gap-y-1" aria-hidden="true">
      <li v-for="item in LEGEND" :key="item.key" class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm border" :class="item.swatch" />
        {{ $t(`reception.box.legend.${item.key}`) }}
      </li>
    </ul>

    <label
      class="press flex min-h-12 cursor-pointer items-center gap-3 rounded-control border p-3
        has-focus-visible:outline-2 has-focus-visible:outline-focus"
      :class="isIgnored ? 'border-brand bg-selected/30' : 'border-default hover:border-strong'"
    >
      <input v-model="isIgnored" class="sr-only" type="checkbox" role="switch" />
      <span class="min-w-0 flex-1">
        <span class="block font-medium text-fg-display">{{ $t('reception.box.ignore') }}</span>
        <span class="body-two block">{{ $t('reception.box.ignoreDetail') }}</span>
      </span>
      <ui-switch :is-on="isIgnored" />
    </label>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSmoothHeight } from 'global/composables/use-smooth-height';
import { areSideBySide, boxesNeeded, formatBoxes, suggestBoxes } from 'lot/composables/lot-boxes';
import { formatKg } from 'lot/composables/quantity';
import type { ILot } from 'lot/types/lot';

import UiSegmented from 'global/components/ui-segmented.vue';
import UiSwitch from 'global/components/ui-switch.vue';
import CheckLineIcon from 'global/icons/check-line.icon.vue';

// props
const props = defineProps<{ modelValue: number[]; boxCount: number; capacityKg: number; netKg: number; occupancy: Map<number, ILot> }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', boxes: number[]): void }>();
/** Lifts the capacity check: Boxes missing at the mill, or none free, and the Client still needs a ticket. */
const isIgnored = defineModel<boolean>('ignored', { default: false });

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
const RANGE_SIZE = 20;
const FLAT_LIMIT = 30;
const isManual = ref(false);
const rangeKey = ref('0');
const isPagingBack = ref(false);
const statusBox = ref<HTMLElement | null>(null);
const pageBox = ref<HTMLElement | null>(null);

// computed
const boxes = computed((): number[] => Array.from({ length: props.boxCount }, (_, index) => index + 1));
const freeBoxes = computed((): number[] => boxes.value.filter((box) => !props.occupancy.has(box)));
const rangesComputed = computed((): number[][] => {
  if (boxes.value.length <= FLAT_LIMIT) return [boxes.value];
  return Array.from({ length: Math.ceil(boxes.value.length / RANGE_SIZE) }, (_, index) => boxes.value.slice(index * RANGE_SIZE, (index + 1) * RANGE_SIZE));
});
const rangeOptionsComputed = computed((): { key: string; label: string; count: number }[] =>
  rangesComputed.value.map((range, index) => ({
    key: String(index),
    label: `${range[0]}–${range[range.length - 1]}`,
    count: range.filter((box) => !props.occupancy.has(box)).length,
  })),
);
const visibleBoxesComputed = computed((): number[] => rangesComputed.value[Number(rangeKey.value)] ?? rangesComputed.value[0] ?? []);
const needed = computed((): number => boxesNeeded(props.netKg, props.capacityKg));
const suggestion = computed((): number[] => suggestBoxes(freeBoxes.value, needed.value));
const canRestoreSuggestion = computed((): boolean => isManual.value && suggestion.value.length > 0 && suggestion.value.join() !== props.modelValue.join());
/** `key` names the state, so the card crossfades when the state changes, not on every keystroke of the weight. */
const status = computed((): { key: string; tone: StatusTone; title: string; detail: string } => {
  const selected = props.modelValue;
  const room = formatKg(selected.length * props.capacityKg);
  const weight = formatKg(props.netKg);
  if (isIgnored.value) {
    return { key: 'ignored', tone: 'neutral', title: t('reception.box.ignored'), detail: selected.length ? t('reception.box.ignoredWith', { boxes: formatBoxes(selected) }) : t('reception.box.ignoredNone') };
  }
  if (!freeBoxes.value.length && !selected.length) return { key: 'noneFree', tone: 'danger', title: t('reception.box.noneFree'), detail: t('reception.box.noneFreeDetail') };
  if (!needed.value && !selected.length) return { key: 'waitingWeight', tone: 'neutral', title: t('reception.box.waitingWeight'), detail: t('reception.box.waitingWeightDetail', { capacity: formatKg(props.capacityKg) }) };
  if (selected.length < needed.value) {
    const missingKg = formatKg(props.netKg - selected.length * props.capacityKg);
    return { key: 'short', tone: 'danger', title: t('reception.box.short', { missing: missingKg }), detail: t('reception.box.shortDetail', { room, weight }) };
  }
  const detail = needed.value ? t('reception.box.fits', { room, weight }) : t('reception.box.room', { room });
  if (isManual.value) return { key: 'chosen', tone: 'neutral', title: t('reception.box.chosen', { boxes: formatBoxes(selected) }), detail };
  return {
    key: 'suggested',
    tone: 'suggested',
    title: t('reception.box.suggested', { boxes: formatBoxes(selected) }),
    detail: areSideBySide(selected) ? detail : `${detail} · ${t('reception.box.notSideBySide')}`,
  };
});

// watchers
useSmoothHeight(statusBox, () => status.value.key);
useSmoothHeight(pageBox, rangeKey);

watch(suggestion, (next) => {
  if (!isManual.value) emit('update:modelValue', next);
});

watch(
  () => props.modelValue[0],
  (first) => {
    if (first === undefined || isManual.value) return;
    rangeKey.value = String(Math.max(rangesComputed.value.findIndex((range) => range.includes(first)), 0));
  },
  { immediate: true },
);

// methods
const boxClass = (box: number): string => {
  if (props.occupancy.has(box)) return 'box-tile-taken';
  return props.modelValue.includes(box) ? 'box-tile-active' : '';
};

const boxLabel = (box: number): string => {
  const holder = props.occupancy.get(box);
  return holder ? t('reception.box.occupiedBy', { box, client: holder.clientName, code: holder.code }) : t('reception.box.freeBox', { box });
};

const rangeHasChosen = (key: string): boolean => (rangesComputed.value[Number(key)] ?? []).some((box) => props.modelValue.includes(box));

// event handlers
const handleRange = (key: string): void => {
  isPagingBack.value = Number(key) < Number(rangeKey.value);
  rangeKey.value = key;
};

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


<style scoped>
/* Ranges slide the way the user moves through them: the old one dissolves in place while the new tiles arrive one after another. */
.box-page-enter-active,
.box-page-back-enter-active {
  transition:
    opacity 380ms var(--ease-premium),
    transform 520ms var(--ease-premium);
}

.box-page-leave-active,
.box-page-back-leave-active {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  pointer-events: none;
  transition:
    opacity 200ms ease-out,
    transform 260ms ease-out,
    filter 200ms ease-out;
}

.box-page-enter-from {
  opacity: 0;
  transform: translateX(calc(var(--flow, 1) * 24px));
}

.box-page-back-enter-from {
  opacity: 0;
  transform: translateX(calc(var(--flow, 1) * -24px));
}

.box-page-leave-to {
  opacity: 0;
  transform: translateX(calc(var(--flow, 1) * -12px));
  filter: blur(3px);
}

.box-page-back-leave-to {
  opacity: 0;
  transform: translateX(calc(var(--flow, 1) * 12px));
  filter: blur(3px);
}

.box-page-enter-active li,
.box-page-back-enter-active li {
  animation: tile-in 460ms calc(var(--tile) * 14ms) var(--ease-premium) backwards;
}

@keyframes tile-in {
  from {
    opacity: 0;
    scale: 0.9;
  }
}

/* The status card crossfades between states while its color and height glide. */
.status-swap-enter-active {
  transition:
    opacity 360ms var(--ease-premium),
    transform 460ms var(--ease-premium),
    filter 360ms var(--ease-premium);
}

.status-swap-leave-active {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  transition:
    opacity 180ms ease-out,
    filter 180ms ease-out;
}

.status-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
  filter: blur(6px);
}

.status-swap-leave-to {
  opacity: 0;
  filter: blur(4px);
}

.status-action-enter-active {
  transition:
    opacity 320ms var(--ease-premium),
    scale 420ms var(--ease-spring);
}

.status-action-leave-active {
  transition:
    opacity 160ms ease-out,
    scale 160ms ease-out;
}

.status-action-enter-from,
.status-action-leave-to {
  opacity: 0;
  scale: 0.92;
}

@media (prefers-reduced-motion: reduce) {
  .box-page-enter-active,
  .box-page-leave-active,
  .box-page-back-enter-active,
  .box-page-back-leave-active,
  .status-swap-enter-active,
  .status-swap-leave-active,
  .status-action-enter-active,
  .status-action-leave-active {
    transition: opacity 120ms linear;
  }

  .box-page-enter-from,
  .box-page-leave-to,
  .box-page-back-enter-from,
  .box-page-back-leave-to,
  .status-swap-enter-from,
  .status-swap-leave-to,
  .status-action-enter-from,
  .status-action-leave-to {
    transform: none;
    scale: none;
    filter: none;
  }

  .box-page-enter-active li,
  .box-page-back-enter-active li {
    animation: none;
  }
}
</style>
