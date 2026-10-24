<template>
  <!-- PROTOTYPE: the Home's four sales figures on the Finances page (ticket 0034); « À confirmer » opens the confirmation queue. -->
  <div :class="layout === 'stacked' ? 'card flex min-w-0 flex-col divide-y divide-neutral-100 rounded-2xl p-0' : 'grid grid-cols-2 gap-3 lg:grid-cols-4'">
    <component
      :is="tile.key === 'pending' ? 'button' : 'div'"
      v-for="tile in tiles"
      :key="tile.key"
      :type="tile.key === 'pending' ? 'button' : undefined"
      class="min-w-0 text-left"
      :class="[
        layout === 'stacked' ? 'flex items-center justify-between gap-3 px-5 py-3.5' : layout === 'strip' ? 'card rounded-xl px-4 py-3' : 'card lift rounded-2xl p-5',
        tile.key === 'pending' ? 'transition hover:ring-2 hover:ring-warning-amber/40' : '',
        tile.key === 'pending' && isActive ? 'ring-2 ring-warning-amber/60' : '',
      ]"
      @click="tile.key === 'pending' && emit('pending')"
    >
      <div class="min-w-0">
        <p class="eyebrow text-neutral-500">{{ tile.label }}</p>
        <p v-if="layout !== 'strip'" class="body-two truncate">{{ tile.sub }}</p>
      </div>
      <p
        class="font-semibold tracking-tight whitespace-nowrap tabular-nums"
        :class="[tile.tone, layout === 'grid' ? 'mt-1 text-3xl' : layout === 'strip' ? 'text-xl' : 'text-2xl']"
      >
        {{ formatDh(tile.value) }}
      </p>
    </component>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { formatDh, type ISalesFiguresPrototype } from 'dashboard/prototype/mock-home.prototype';
import type { IPeriodPrototype } from 'dashboard/prototype/use-period.prototype';

// props
const props = defineProps<{ figures: ISalesFiguresPrototype; period: IPeriodPrototype; layout: 'grid' | 'stacked' | 'strip'; isActive?: boolean }>();

// emits
const emit = defineEmits<{ (event: 'pending'): void }>();

// computed
const share = (value: number): string => `${Math.round((value / (props.figures.revenue || 1)) * 100)} % du CA`;
const tiles = computed(() => [
  { key: 'revenue', label: `CA · ${props.period.label}`, value: props.figures.revenue, sub: 'ventes d’huile et produits', tone: 'text-neutral-900' },
  { key: 'collected', label: 'Encaissé', value: props.figures.collected, sub: share(props.figures.collected), tone: 'text-primary-olive-dark' },
  { key: 'pending', label: 'À confirmer', value: props.figures.pending, sub: `${props.figures.pendingCount} paiements · voir la file →`, tone: 'text-warning-amber' },
  { key: 'outstanding', label: 'Reste à encaisser', value: props.figures.outstanding, sub: share(props.figures.outstanding), tone: 'text-accent-rust' },
]);
</script>
