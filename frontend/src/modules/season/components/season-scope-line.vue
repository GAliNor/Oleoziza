<template>
  <span v-if="isKnownComputed" class="block truncate text-xs leading-4" :class="scopeComputed.key === 'open' ? 'text-fg-secondary-paragraph' : 'font-medium text-fg-warning'">{{ $t(`season.scope.${scopeComputed.key}`, { season: scopeComputed.season }) }}</span>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted } from 'vue';

import { useSeasonStore } from 'season/stores/season';
import { seasonScope, type ISeasonScope } from 'season/composables/season-scope';
import { todayIso } from 'global/composables/date';

// stores
const seasonStore = useSeasonStore();

// computed
/** Nothing is said before the first answer, nor offline without one. */
const isKnownComputed = computed((): boolean => seasonStore.isLoaded);
const scopeComputed = computed((): ISeasonScope => seasonScope(seasonStore.seasons, todayIso()));

// lifecycle
onMounted(() => {
  seasonStore.fetchSeasons();
});
</script>
