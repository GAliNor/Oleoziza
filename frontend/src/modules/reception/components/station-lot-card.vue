<template>
  <div class="rounded-card bg-action p-5 text-fg-on-action md:col-start-1 md:row-start-1">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="eyebrow text-sm text-fg-on-action-muted">{{ $t('reception.station.eyebrow', { code: lot.code }) }}</p>
        <p class="truncate text-lg font-semibold">{{ lot.clientName }}</p>
        <p class="body-two text-fg-on-action-muted">{{ $t(`reception.modes.${lot.mode}`) }} · {{ lot.variety }}</p>
      </div>
      <span v-if="lot.isPendingSync" class="chip shrink-0 bg-surface/15 text-fg-on-action">{{ $t('reception.pendingSync') }}</span>
    </div>
    <p class="mt-4 text-display-lg figure">{{ formatKg(lot.netKg) }}</p>
    <p class="body-two text-fg-on-action-muted tabular-nums">
      {{ formatQuintals(lot.netKg) }} · {{ $t('reception.station.weighings', lot.weighings.length) }}
      <template v-if="lot.dailyPricePerKg !== null"> · {{ formatMoney(lot.netKg * lot.dailyPricePerKg) }}</template>
    </p>
    <div v-if="lot.announcedContainers" class="mt-4">
      <div class="flex justify-between body-two text-fg-on-action-muted">
        <span>{{ $t('reception.station.containersWeighed') }}</span>
        <span class="tabular-nums">{{ containersWeighed }} / {{ lot.announcedContainers }}</span>
      </div>
      <ui-progress-bar class="mt-1 h-2" :value="containersWeighed" :max="lot.announcedContainers" :label="$t('reception.station.containersWeighed')" bar-class="bg-highlight" track-class="bg-surface/15" />
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { weighedContainers } from 'reception/composables/weighing';
import { formatMoney } from 'global/composables/money';
import { formatKg, formatQuintals } from 'lot/composables/quantity';
import type { ILot } from 'lot/types/lot';

import UiProgressBar from 'global/components/ui-progress-bar.vue';

// props
const props = defineProps<{ lot: ILot }>();

// computed
const containersWeighed = computed((): number => weighedContainers(props.lot));
</script>
