<template>
  <ol class="flex flex-col gap-2 md:col-start-1 md:row-start-2">
    <li v-for="(weighing, index) in reversedWeighings" :key="weighing.id" class="flex items-center gap-3 rounded-2xl border border-default bg-surface px-4 py-3" :class="{ rise: index === 0 }">
      <span class="round-badge h-9 w-9 bg-subtle text-fg-primary-paragraph">{{ lot.weighings.length - index }}</span>
      <span class="min-w-0 flex-1 body-two">
        {{ formatTime(weighing.recordedAt) }} · {{ weighing.source === 'scale' ? $t('reception.station.scale') : $t('reception.station.manual') }}
        <template v-if="weighing.kind === 'gross' && weighing.grossKg !== null">
          · {{ $t('reception.station.grossHint', { gross: formatKg(weighing.grossKg), tare: formatKg(weighing.grossKg - weighing.netKg) }) }}
        </template>
        <span class="block caption">{{ weighing.recordedBy }}</span>
      </span>
      <span class="flex flex-col items-end gap-1">
        <span class="font-semibold text-fg-display tabular-nums">{{ formatKg(weighing.netKg) }}</span>
        <span v-if="weighing.isPendingSync" class="chip bg-warning-subtle text-fg-warning">{{ $t('reception.pendingSync') }}</span>
      </span>
    </li>
    <li v-if="!lot.weighings.length" class="body-two rounded-2xl border border-dashed border-strong p-6 text-center">
      {{ $t('reception.station.noWeighing') }}
    </li>
  </ol>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { formatTime } from 'global/composables/date';
import { formatKg } from 'lot/composables/quantity';
import type { ILot } from 'lot/types/lot';

// props
const props = defineProps<{ lot: ILot }>();

// computed
const reversedWeighings = computed(() => [...props.lot.weighings].reverse());
</script>
