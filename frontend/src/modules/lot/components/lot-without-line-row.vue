<template>
  <div>
    <button type="button" class="flex min-h-18 w-full items-center gap-3 px-4 py-3 text-start transition-colors duration-200 ease-(--ease-premium) hover:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus" :aria-expanded="isOpen" @click="emit('toggle')">
      <span class="min-w-0 flex-1">
        <span class="block truncate font-semibold text-fg-display">{{ lot.clientName }}</span>
        <span class="block body-two text-fg-primary-paragraph tabular-nums">{{ detailComputed }}</span>
      </span>
      <span v-if="lot.isPendingSync" class="chip shrink-0 bg-warning-subtle text-fg-warning">{{ $t('lot.withoutLine.unsent') }}</span>
      <chevron-down-line-icon class="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-300 ease-(--ease-spring)" :class="{ 'rotate-180': isOpen }" />
    </button>
    <div class="fold" :class="{ 'is-open': isOpen }" :inert="!isOpen">
      <div class="min-h-0 overflow-hidden">
        <div class="flex flex-col gap-2 px-4 pb-4">
          <template v-if="canAssign && lines.length">
            <p class="label">{{ $t('lot.withoutLine.pick') }}</p>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="line in lines" :key="line.id" type="button" class="toggle-tile flex min-h-14 flex-col items-start justify-center text-start" :disabled="lotStore.isSaving" @click="emit('assign', line)">
                <span class="font-semibold text-fg-display">{{ formatPressLine(line) }}</span>
                <span class="body-three">{{ $t('reception.line.queue', queueOf(line)) }}</span>
              </button>
            </div>
          </template>
          <p v-else-if="canAssign" class="body-two">{{ $t('lot.withoutLine.noLine') }}</p>
          <button type="button" class="btn-plain self-start px-2" @click="emit('detail')">{{ $t('lot.withoutLine.detail') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { useLotStore } from 'lot/stores/lot';
import { formatPressLine } from 'configuration/composables/equipment';
import { formatDateTime } from 'global/composables/date';
import { formatBoxes } from 'lot/composables/lot-boxes';
import { lineQueue } from 'lot/composables/press-schedule';
import { formatKg } from 'lot/composables/quantity';
import type { IPressLineSetting } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';

import ChevronDownLineIcon from 'global/icons/chevron-down-line.icon.vue';

// props
const props = defineProps<{ lot: ILot; lines: IPressLineSetting[]; lots: ILot[]; isOpen: boolean; canAssign: boolean }>();

// emits
const emit = defineEmits<{
  (event: 'toggle'): void;
  (event: 'detail'): void;
  (event: 'assign', line: IPressLineSetting): void;
}>();

// stores
const lotStore = useLotStore();

// computed
const detailComputed = computed((): string => [props.lot.code, formatKg(props.lot.netKg), formatDateTime(props.lot.receivedAt), props.lot.boxNumbers.length ? formatBoxes(props.lot.boxNumbers) : ''].filter(Boolean).join(' · '));

// methods
const queueOf = (line: IPressLineSetting): number => lineQueue(props.lots, line.id).length;
</script>

<style scoped>
.fold {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 380ms var(--ease-premium),
    opacity 240ms ease-out;
}

.fold.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .fold {
    transition: none;
  }
}
</style>
