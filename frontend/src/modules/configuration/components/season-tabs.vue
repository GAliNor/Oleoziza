<template>
  <div class="flex flex-col gap-3">
    <nav class="flex flex-wrap items-center gap-2" :aria-label="$t('configuration.season.tabsLabel')">
      <button
        v-for="season in seasonStore.seasons"
        :key="season.id"
        type="button"
        class="choice-chip inline-flex items-center gap-2"
        :class="{ 'choice-chip-active': season.id === modelValue }"
        :aria-pressed="season.id === modelValue"
        @click="emit('update:modelValue', season.id)"
      >
        {{ shortLabel(season) }}
        <span class="caption opacity-75">{{ $t(`season.status.${season.status}`) }}</span>
      </button>
      <button
        v-if="canManage && !seasonStore.plannedSeason"
        type="button"
        class="choice-chip border-dashed"
        :class="{ 'choice-chip-active': isPreparing }"
        :aria-expanded="isPreparing"
        :disabled="isLocked"
        @click="isPreparing = !isPreparing"
      >
        {{ $t('configuration.season.prepare', { label: nextLabel }) }}
      </button>
    </nav>
    <div v-if="isPreparing && canManage && !seasonStore.plannedSeason" class="card flex flex-col gap-3 p-4">
      <season-illustration-picker v-model="pickedIllustrationIdComputed" :season-code="nextCode" :is-disabled="isLocked" />
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-primary" :disabled="isLocked" @click="handlePrepare">{{ $t('configuration.season.prepareSubmit', { label: nextLabel }) }}</button>
        <button type="button" class="btn-secondary" @click="isPreparing = false">{{ $t('configuration.cancel') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, defineAsyncComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSeasonStore } from 'season/stores/season';
import { useToastStore } from 'global/stores/toast';
import { harvestYear } from 'season/composables/harvest-year';
import type { ISeason } from 'season/types/season';

const SeasonIllustrationPicker = defineAsyncComponent(() => import('season/components/season-illustration-picker.vue'));

// props
defineProps<{ modelValue: string | null; canManage: boolean; isLocked: boolean }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', seasonId: string): void }>();

// stores
const seasonStore = useSeasonStore();
const toastStore = useToastStore();
const { t } = useI18n();

// variables
const isPreparing = ref(false);
const pickedIllustrationId = ref<string | null | undefined>(undefined);

// computed
const nextLabel = computed((): string => {
  const latest = seasonStore.seasons.at(-1);
  const year = latest ? harvestYear(latest.startsOn) + 1 : new Date().getFullYear();
  return `${year}-${year + 1}`;
});
const nextCode = computed((): string => nextLabel.value.split('-').map((year) => year.slice(2)).join(''));
const pickedIllustrationIdComputed = computed({
  get: (): string | null => (pickedIllustrationId.value === undefined ? (seasonStore.illustrations[0]?.id ?? null) : pickedIllustrationId.value),
  set: (seasonIllustrationId: string | null): void => {
    pickedIllustrationId.value = seasonIllustrationId;
  },
});

// methods
/** Named after its harvest, whatever day it was moved to. */
const shortLabel = (season: ISeason): string => season.label.replace(/^\D+/, '');

// event handlers
const handlePrepare = async (): Promise<void> => {
  const season = await seasonStore.prepareNext(pickedIllustrationIdComputed.value);
  if (!season) return;
  toastStore.push(t('configuration.season.prepared', { label: season.label }), 'success');
  isPreparing.value = false;
  pickedIllustrationId.value = undefined;
  emit('update:modelValue', season.id);
};
</script>
