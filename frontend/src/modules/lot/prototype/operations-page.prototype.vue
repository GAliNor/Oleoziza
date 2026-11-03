<template>
  <!-- PROTOTYPE: Management Opérations page at /operations (ticket 0036), register table and stage board switchable with ?view=board, filtered by ?period=. -->
  <app-layout>
    <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
      <header class="rise flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="flex flex-col gap-1">
          <h1 class="heading-one">Opérations</h1>
          <p class="body-two">{{ scopeName }} · registre des lots {{ period.noun }} · {{ scoped.length }} lots</p>
        </div>
        <div v-show="!isLotOpen" class="inline-flex shrink-0 self-start rounded-xl bg-subtle p-1 md:self-auto" role="radiogroup" aria-label="Affichage">
          <button
            v-for="(label, key) in VIEWS"
            :key="key"
            type="button"
            role="radio"
            :aria-checked="view === key"
            class="min-h-10 rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors duration-300 ease-(--ease-premium)"
            :class="view === key ? 'bg-surface text-fg-display shadow-raised' : 'text-fg-secondary-paragraph hover:text-fg-default'"
            @click="handleView(key)"
          >
            {{ label }}
          </button>
        </div>
      </header>
      <div v-show="!isLotOpen" class="rise flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input v-model="search" class="input lg:max-w-xs" type="search" placeholder="N° de lot ou Client" />
        <segmented-control class="self-start lg:self-auto" :model-value="period.key" :options="PERIODS" aria-label="Période" @update:model-value="selectPeriod" />
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

import { useSiteStore } from 'global/stores/site';
import { PERIODS } from 'dashboard/prototype/use-period.prototype';
import { useLotsPrototype } from 'lot/prototype/use-lots.prototype';

import AppLayout from 'global/components/app-layout.vue';
import SegmentedControl from 'dashboard/prototype/segmented-control.prototype.vue';
import VariantA from 'lot/prototype/variant-a.prototype.vue';
import VariantB from 'lot/prototype/variant-b.prototype.vue';

// stores
const route = useRoute();
const router = useRouter();
const siteStore = useSiteStore();
const { scoped, period, selectPeriod } = useLotsPrototype();

// variables
const VIEWS = { table: 'Tableau', board: 'Par étape' } as const;
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
