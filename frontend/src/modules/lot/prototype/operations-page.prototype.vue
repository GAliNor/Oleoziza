<template>
  <!-- PROTOTYPE: Management Opérations page at /operations (ticket 0036), register table and stage board switchable with ?view=board, filtered by ?period=. -->
  <app-layout>
    <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
      <header class="rise flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="flex flex-col gap-1">
          <h1 class="heading-one">Opérations</h1>
          <p class="body-two">{{ scopeName }} · registre des lots {{ period.noun }} · {{ scoped.length }} lots</p>
        </div>
        <ui-segmented v-show="!isLotOpen" class="shrink-0 self-start md:self-auto" variant="tabs" :model-value="view" :options="VIEW_OPTIONS" label="Affichage" @update:model-value="handleView" />
      </header>
      <div v-show="!isLotOpen" class="rise flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input v-model="search" class="input lg:max-w-xs" type="search" placeholder="N° de lot ou Client" />
        <ui-segmented class="self-start lg:self-auto" :model-value="period.key" :options="PERIODS" label="Période" @update:model-value="selectPeriod" />
      </div>

      <variant-b v-if="view === 'board'" :search="search" />
      <variant-a v-else :search="search" />
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useSiteStore } from 'site/stores/site';
import { PERIODS } from 'dashboard/prototype/use-period.prototype';
import { useLotsPrototype } from 'lot/prototype/use-lots.prototype';

import AppLayout from 'global/components/app-layout.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import VariantA from 'lot/prototype/variant-a.prototype.vue';
import VariantB from 'lot/prototype/variant-b.prototype.vue';

// stores
const route = useRoute();
const router = useRouter();
const siteStore = useSiteStore();
const { scoped, period, selectPeriod } = useLotsPrototype();

// variables
const VIEWS = { table: 'Tableau', board: 'Par étape' } as const;
const VIEW_OPTIONS = [
  { key: 'table' as const, label: VIEWS.table },
  { key: 'board' as const, label: VIEWS.board },
];
const search = ref('');

// computed
const view = computed((): keyof typeof VIEWS => (route.query.view === 'board' ? 'board' : 'table'));
const isLotOpen = computed((): boolean => typeof route.query.lot === 'string');
const scopeName = computed((): string => (siteStore.isAllSites ? 'Tous les sites' : (siteStore.currentSite?.name ?? '')));

// event handlers
const handleView = (key: keyof typeof VIEWS): void => {
  router.replace({ query: { ...route.query, view: key === 'table' ? undefined : key, variant: undefined } });
};
</script>
