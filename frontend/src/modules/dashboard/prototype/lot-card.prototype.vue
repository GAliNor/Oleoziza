<template>
  <article
    class="card flex flex-col gap-3 transition-colors hover:border-primary-olive-mid"
    :class="{ 'p-3': isCompact }"
    role="button"
    tabindex="0"
    @click="emit('open', lot)"
    @keydown.enter="emit('open', lot)"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate font-semibold text-neutral-900">{{ lot.client }}</p>
        <p class="body-two truncate">{{ lot.code }} · {{ lot.variety }}</p>
        <span v-if="lot.isPendingSync" class="chip mt-1 bg-warning-amber/15 text-warning-amber">À synchroniser</span>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-1">
        <span class="text-lg font-semibold text-neutral-900 tabular-nums">{{ formatKg(lot.netKg) }}</span>
        <span v-if="isStatusShown" class="chip" :class="STATUS_CLASSES[lot.status]">{{ STATUS_LABELS[lot.status] }}</span>
        <span v-if="lot.mode === 'purchase'" class="chip bg-accent-sand/30 text-accent-brown">Achat</span>
      </div>
    </div>

    <div class="flex items-center gap-1" :aria-label="`Étape : ${STATUS_LABELS[lot.status]}`">
      <span
        v-for="(status, index) in LOT_STATUSES"
        :key="status"
        class="h-1.5 flex-1 rounded-full"
        :class="index <= currentIndex ? 'bg-primary-olive' : 'bg-neutral-200'"
      />
    </div>

    <div class="flex items-center justify-between gap-2">
      <p class="body-two shrink-0">{{ lot.receivedAt }} · {{ lot.operator }}</p>
      <button
        v-if="NEXT_STEP_LABELS[lot.status] && !isCompact"
        type="button"
        class="min-h-11 rounded-lg bg-primary-olive-light px-3 py-2 text-sm font-medium whitespace-nowrap text-primary-olive-dark hover:bg-primary-olive-mid/40"
        @click.stop="emit('advance', lot)"
      >
        {{ NEXT_STEP_LABELS[lot.status] }} →
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
// PROTOTYPE — Lot card for the Operator Home prototype (ticket 0018).
// imports
import { computed } from 'vue';

import { formatKg, LOT_STATUSES, NEXT_STEP_LABELS, STATUS_LABELS, type ILotPrototype, type LotStatus } from 'dashboard/prototype/mock-home.prototype';

// props
const props = defineProps<{ lot: ILotPrototype; isCompact?: boolean; isStatusShown?: boolean }>();

// emits
const emit = defineEmits<{ open: [lot: ILotPrototype]; advance: [lot: ILotPrototype] }>();

// variables
const STATUS_CLASSES: Record<LotStatus, string> = {
  received: 'bg-info-blue/10 text-info-blue',
  waiting: 'bg-accent-gold/30 text-accent-brown',
  pressing: 'bg-primary-olive-dark text-white',
  pressed: 'bg-primary-olive-light text-primary-olive-dark',
  withdrawn: 'bg-neutral-100 text-neutral-500',
};

// computed
const currentIndex = computed((): number => LOT_STATUSES.indexOf(props.lot.status));
</script>
