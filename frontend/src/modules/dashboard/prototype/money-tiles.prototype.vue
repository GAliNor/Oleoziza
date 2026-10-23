<template>
  <div v-if="isStacked" class="card flex min-w-0 flex-col divide-y divide-neutral-100 rounded-2xl p-0">
    <div v-for="tile in tiles" :key="tile.key" class="flex items-center justify-between gap-3 px-5 py-3.5">
      <div class="min-w-0">
        <p class="eyebrow text-neutral-500">{{ tile.label }}</p>
        <p class="body-two truncate">{{ tile.sub }}</p>
      </div>
      <p class="text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums" :class="tile.tone">{{ formatDh(tile.value) }}</p>
    </div>
  </div>
  <div v-else class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <kpi-tile v-for="tile in tiles" :key="tile.key" :label="tile.label" :value="tile.value" unit="DH" :sub="tile.sub" />
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — the four sales tiles of Management Home v2 (tickets 0028 and 0029): CA = Encaissé + À confirmer + Reste à encaisser.
// imports
import { computed } from 'vue';

import { formatDh, type ISalesFiguresPrototype } from 'dashboard/prototype/mock-home.prototype';
import type { IPeriodPrototype } from 'dashboard/prototype/use-period.prototype';

import KpiTile from 'dashboard/prototype/kpi-tile.prototype.vue';

// props
const props = withDefaults(defineProps<{ figures: ISalesFiguresPrototype; period: IPeriodPrototype; isStacked?: boolean }>(), { isStacked: false });

// computed
const share = (value: number): string => `${Math.round((value / (props.figures.revenue || 1)) * 100)} % du CA`;
const tiles = computed(() => [
  { key: 'revenue', label: `Chiffre d’affaires · ${props.period.label}`, value: props.figures.revenue, sub: 'ventes d’huile et produits', tone: 'text-neutral-900' },
  { key: 'collected', label: 'Encaissé', value: props.figures.collected, sub: share(props.figures.collected), tone: 'text-primary-olive-dark' },
  { key: 'pending', label: 'À confirmer', value: props.figures.pending, sub: `${props.figures.pendingCount} paiements · voir →`, tone: 'text-warning-amber' },
  { key: 'outstanding', label: 'Reste à encaisser', value: props.figures.outstanding, sub: share(props.figures.outstanding), tone: 'text-accent-rust' },
]);
</script>
