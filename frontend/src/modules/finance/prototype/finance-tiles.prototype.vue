<template>
  <!-- PROTOTYPE: the Home's four sales figures on the Finances page (ticket 0034); « À confirmer » opens the confirmation queue. -->
  <div :class="layout === 'stacked' ? 'card flex min-w-0 flex-col divide-y divide-subtle rounded-2xl p-0' : 'grid grid-cols-2 gap-3 lg:grid-cols-4'">
    <component
      :is="tile.key === 'pending' ? 'button' : 'div'"
      v-for="tile in tiles"
      :key="tile.key"
      :type="tile.key === 'pending' ? 'button' : undefined"
      class="min-w-0 text-left"
      :class="[
        layout === 'stacked' ? 'flex items-center justify-between gap-3 px-5 py-3.5' : layout === 'strip' ? 'card rounded-xl px-4 py-3' : 'card lift rounded-2xl p-5',
        tile.key === 'pending' ? 'transition hover:ring-2 hover:ring-warning/40' : '',
        tile.key === 'pending' && isActive ? 'ring-2 ring-warning/60' : '',
      ]"
      @click="tile.key === 'pending' && emit('pending')"
    >
      <div class="min-w-0">
        <p class="eyebrow text-fg-secondary-paragraph">{{ tile.label }}</p>
        <p v-if="layout !== 'strip'" class="body-two truncate">{{ tile.sub }}</p>
      </div>
      <p
        class="font-semibold tracking-tight whitespace-nowrap tabular-nums"
        :class="[tile.tone, layout === 'grid' ? 'mt-1 text-display-xs sm:text-display-sm' : layout === 'strip' ? 'text-xl' : 'text-display-xs']"
        v-count-up="{ value: tile.value, format: formatMoneyRounded }"
      />
    </component>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { type ISalesFiguresPrototype } from 'dashboard/prototype/mock-home.prototype';
import type { IPeriodPrototype } from 'dashboard/prototype/use-period.prototype';
import { formatMoneyRounded } from 'global/composables/money';

// props
const props = defineProps<{ figures: ISalesFiguresPrototype; period: IPeriodPrototype; layout: 'grid' | 'stacked' | 'strip'; isActive?: boolean }>();

// emits
const emit = defineEmits<{ (event: 'pending'): void }>();

// computed
const share = (value: number): string => `${Math.round((value / (props.figures.revenue || 1)) * 100)} % du CA`;
const tiles = computed(() => [
  { key: 'revenue', label: `CA · ${props.period.label}`, value: props.figures.revenue, sub: 'ventes d’huile et produits', tone: 'text-fg-display' },
  { key: 'collected', label: 'Encaissé', value: props.figures.collected, sub: share(props.figures.collected), tone: 'text-fg-brand' },
  { key: 'pending', label: 'À confirmer', value: props.figures.pending, sub: `${props.figures.pendingCount} paiements · voir la file →`, tone: 'text-fg-warning' },
  { key: 'outstanding', label: 'Reste à encaisser', value: props.figures.outstanding, sub: share(props.figures.outstanding), tone: 'text-fg-warning' },
]);
</script>
