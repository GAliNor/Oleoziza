<template>
  <article class="card flex flex-col gap-4 p-4">
    <header class="flex items-center justify-between gap-3">
      <h2 class="heading-five min-w-0 truncate">{{ board.line ? formatPressLine(board.line) : $t('dashboard.operator.line.unplanned') }}</h2>
      <span v-if="board.line" class="chip shrink-0" :class="isRunningComputed ? 'bg-success-subtle text-fg-success' : 'bg-subtle text-fg-secondary-paragraph'">
        {{ $t(isRunningComputed ? 'dashboard.operator.line.running' : 'dashboard.operator.line.free') }}
      </span>
    </header>

    <template v-for="(entry, index) in board.slots" :key="entry.lot.id">
      <hr v-if="index" class="border-default" />
      <line-slot :entry="entry" @open="emit('open', $event)" @move="emit('move', $event)" />
      <p v-if="entry.kind === 'next' && !entry.canMove && board.line" class="-mt-2 body-two">{{ $t('dashboard.operator.line.afterCurrent') }}</p>
    </template>

    <p v-if="!board.slots.length" class="body-two">{{ $t('dashboard.operator.line.empty') }}</p>
    <p v-if="board.laterCount" class="caption">{{ $t('dashboard.operator.line.later', board.laterCount) }}</p>
  </article>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { formatPressLine } from 'configuration/composables/equipment';
import type { ILineBoard } from 'dashboard/composables/use-operator-desk';
import type { ILot } from 'lot/types/lot';

import LineSlot from 'dashboard/components/line-slot.vue';

// props
const props = defineProps<{ board: ILineBoard }>();

// emits
const emit = defineEmits<{
  (event: 'open', lot: ILot): void;
  (event: 'move', lot: ILot): void;
}>();

// computed
const isRunningComputed = computed((): boolean => props.board.slots.some((entry) => entry.kind === 'now'));
</script>
