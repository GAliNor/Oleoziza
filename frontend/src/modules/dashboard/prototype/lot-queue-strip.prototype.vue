<template>
  <div class="card flex flex-wrap items-center gap-2 rounded-2xl p-4">
    <p class="label mr-2">File des lots <span class="font-normal text-fg-secondary-paragraph">· maintenant</span></p>
    <span v-for="status in STATUSES" :key="status" class="chip bg-subtle px-3 py-1 text-sm text-fg-primary-paragraph">
      {{ STATUS_LABELS[status] }} <span class="font-semibold tabular-nums">{{ queue[status] }}</span>
    </span>
    <a href="#" class="link ml-auto">Voir la file →</a>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — Lot queue strip of the Management Home (ticket 0019), lifted out of the Home for the v2 variants.
// imports
import { LOT_STATUSES, STATUS_LABELS, type LotStatus } from 'dashboard/prototype/mock-home.prototype';

// props
defineProps<{ queue: Record<LotStatus, number> }>();

// variables
const STATUSES: LotStatus[] = LOT_STATUSES.filter((status) => status !== 'withdrawn');
</script>
