<template>
  <!-- PROTOTYPE: Management Opérations page at /operations (ticket 0036), three variants switchable with ?variant=A|B|C. -->
  <app-layout>
    <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
      <header class="rise flex flex-col gap-1">
        <h1 class="heading-one">Opérations</h1>
        <p class="body-two">{{ scopeName }} · registre des lots de la Saison · {{ scoped.length }} lots</p>
      </header>
      <p v-if="isReadOnly" class="chip self-start bg-neutral-100 text-neutral-600">Tous les sites · lecture seule</p>

      <variant-a v-if="variant === 'A'" />
      <variant-b v-else-if="variant === 'B'" />
      <variant-c v-else />
    </section>
    <prototype-switcher :variants="VARIANTS" />
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useSiteStore } from 'global/stores/site';
import { useLotsPrototype } from 'lot/prototype/use-lots.prototype';

import AppLayout from 'global/components/app-layout.vue';
import PrototypeSwitcher from 'global/components/prototype-switcher.vue';
import VariantA from 'lot/prototype/variant-a.prototype.vue';
import VariantB from 'lot/prototype/variant-b.prototype.vue';
import VariantC from 'lot/prototype/variant-c.prototype.vue';

// stores
const route = useRoute();
const siteStore = useSiteStore();
const { scoped, isReadOnly } = useLotsPrototype();

// variables
const VARIANTS = { A: 'Registre en tableau', B: 'Tableau par étape', C: 'Vérifier d’abord' };

// computed
const variant = computed((): string => (Object.keys(VARIANTS).includes(String(route.query.variant)) ? String(route.query.variant) : 'A'));
const scopeName = computed((): string => (siteStore.isAllSites ? 'Tous les sites' : (siteStore.currentSite?.name ?? '')));
</script>
