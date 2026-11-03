<template>
  <!-- PROTOTYPE: Management Finances page at /finances (ticket 0034): the four tiles, then the movements table. -->
  <app-layout>
    <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
      <header class="rise flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex flex-col gap-1">
          <h1 class="heading-one">Finances</h1>
          <p class="body-two">{{ scopeName }} · paiements reçus et versements payés</p>
        </div>
        <segmented-control :model-value="period.key" :options="PERIODS" aria-label="Période" @update:model-value="selectPeriod" />
      </header>
      <p v-if="isReadOnly" class="chip self-start bg-subtle text-fg-primary-paragraph">Tous les sites · lecture seule</p>

      <variant-a />
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { useSiteStore } from 'global/stores/site';
import { PERIODS } from 'dashboard/prototype/use-period.prototype';
import { useFinancePrototype } from 'finance/prototype/use-finance.prototype';

import AppLayout from 'global/components/app-layout.vue';
import SegmentedControl from 'dashboard/prototype/segmented-control.prototype.vue';
import VariantA from 'finance/prototype/variant-a.prototype.vue';

// stores
const siteStore = useSiteStore();
const { period, selectPeriod, isReadOnly } = useFinancePrototype();

// computed
const scopeName = computed((): string => (siteStore.isAllSites ? 'Tous les sites' : (siteStore.currentSite?.name ?? '')));
</script>
