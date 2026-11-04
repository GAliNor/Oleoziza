<template>
  <p v-show="!isOpen" class="rise body-two">{{ $t('lot.register.boardHint') }}</p>

  <ui-master-detail :is-open="isOpen" :back-label="$t('lot.register.backToBoard')" @close="closeLot">
    <template #list>
      <div class="flex snap-x gap-3 overflow-x-auto pb-3">
        <section v-for="column in columns" :key="column.key" class="flex w-72 shrink-0 snap-start flex-col gap-2 rounded-card bg-subtle/70 p-3">
          <header class="flex items-center justify-between px-1">
            <h2 class="heading-six">{{ $t(`lot.status.${column.key}`) }}</h2>
            <span class="chip bg-surface text-fg-primary-paragraph tabular-nums">{{ column.total }}</span>
          </header>
          <button
            v-for="lot in column.lots"
            :key="lot.id"
            type="button"
            class="press-lift flex flex-col gap-1 rounded-card border border-default bg-surface p-3 text-left shadow-raised"
            @click="openLot(lot.id)"
          >
            <span class="flex items-center justify-between gap-2">
              <span class="font-semibold text-fg-display">{{ lot.code }}</span>
              <span class="body-three">{{ formatReceived(lot.receivedAt) }}</span>
            </span>
            <span class="truncate body-two text-fg-default">{{ lot.clientName }}</span>
            <span class="body-three tabular-nums">
              {{ formatQuintals(lot.netKg) }}
              <template v-if="lot.oilKg"> · {{ formatOilKg(lot.oilKg) }} · {{ formatYield(lot.oilKg, lot.netKg) }}</template>
            </span>
          </button>
          <p v-if="!column.lots.length" class="px-1 py-4 text-center body-two">—</p>
        </section>
      </div>
    </template>
    <template v-if="active" #detail>
      <lot-detail :key="active.id" :lot="active" />
    </template>
  </ui-master-detail>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { useLotRegister, useOpenLot } from 'lot/composables/use-lot-register';
import { formatOilKg, formatQuintals, formatYield } from 'lot/composables/quantity';
import { formatShortDate, formatTime, todayIso, toIsoDate } from 'global/composables/date';
import { LOT_STATUSES } from 'lot/constants/lot';
import type { ILot } from 'lot/types/lot';

import UiMasterDetail from 'global/components/ui-master-detail.vue';
import LotDetail from 'lot/components/lot-detail.vue';

// props
const props = defineProps<{ search: string }>();

// stores
const { scoped } = useLotRegister();
const { isOpen, active, openLot, closeLot } = useOpenLot();

// variables
const WITHDRAWN_SHOWN = 6;

// computed
const matching = computed((): ILot[] => {
  const query = props.search.trim().toLowerCase();
  return scoped.value.filter((lot) => lot.code.toLowerCase().includes(query) || lot.clientName.toLowerCase().includes(query));
});
const columns = computed(() =>
  LOT_STATUSES.map((key) => {
    const all = matching.value.filter((lot) => lot.status === key);
    const lots = key === 'withdrawn' && !props.search ? all.slice(0, WITHDRAWN_SHOWN) : [...all].reverse();
    return { key, lots, total: all.length };
  }),
);

// methods
const formatReceived = (at: string): string => (toIsoDate(at) === todayIso() ? formatTime(at) : formatShortDate(at));
</script>
