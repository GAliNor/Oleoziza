<template>
  <div class="card flex flex-wrap items-center gap-2 p-4">
    <p class="label me-2">{{ $t('dashboard.management.queue.title') }} <span class="font-normal text-fg-secondary-paragraph">{{ $t('dashboard.management.queue.now') }}</span></p>
    <span v-for="status in STATUSES" :key="status" class="chip bg-subtle px-3 py-1 text-sm text-fg-primary-paragraph">
      {{ $t(`lot.status.${status}`) }} <span class="font-semibold tabular-nums">{{ countOf(status) }}</span>
    </span>
    <router-link :to="{ name: 'lot' }" class="link ms-auto">{{ $t('dashboard.management.queue.open') }}</router-link>
  </div>
</template>

<script setup lang="ts">
// imports
import { useLotStore } from 'lot/stores/lot';
import { LOT_STATUSES } from 'lot/constants/lot';
import type { LotStatus } from 'lot/types/lot';

// stores
const lotStore = useLotStore();

// variables
const STATUSES = LOT_STATUSES.filter((status) => status !== 'withdrawn');

// methods
const countOf = (status: LotStatus): number => lotStore.lots.filter((lot) => lot.status === status).length;
</script>
