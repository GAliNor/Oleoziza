<template>
  <fieldset class="flex flex-col gap-2">
    <legend class="caption mb-2 text-fg-muted">{{ $t('season.illustration.pick') }}</legend>
    <ui-empty-state v-if="seasonStore.hasIllustrationsError" tone="danger" size="compact" :message="$t('season.illustration.loadError')" />
    <div v-else-if="seasonStore.isLoadingIllustrations && !seasonStore.illustrations.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div v-for="index in 3" :key="index" class="skeleton aspect-[4/1] rounded-card" />
    </div>
    <div v-else role="radiogroup" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <season-illustration-option
        v-for="illustration in seasonStore.illustrations"
        :key="illustration.id"
        :art="illustration"
        :label="illustration.code"
        :is-selected="modelValue === illustration.id"
        :is-disabled="isDisabled"
        @select="emit('update:modelValue', illustration.id)"
      />
      <season-illustration-option :art="sketchComputed" :label="$t('season.illustration.none')" :is-selected="modelValue === null" :is-disabled="isDisabled" @select="emit('update:modelValue', null)" />
    </div>
    <p v-if="isEmptyComputed" class="caption text-fg-muted">{{ $t('season.illustration.empty') }}</p>
  </fieldset>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted } from 'vue';

import { useSeasonStore } from 'season/stores/season';
import type { SeasonArtImages } from 'season/types/season';

import SeasonIllustrationOption from 'season/components/season-illustration-option.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';

// props
const props = defineProps<{ modelValue: string | null; seasonCode: string; isDisabled?: boolean }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', seasonIllustrationId: string | null): void }>();

// stores
const seasonStore = useSeasonStore();

// computed
const sketchComputed = computed((): SeasonArtImages => ({ code: props.seasonCode, illustrationUrl: null, illustrationDarkUrl: null }));
const isEmptyComputed = computed((): boolean => !seasonStore.isLoadingIllustrations && !seasonStore.hasIllustrationsError && !seasonStore.illustrations.length);

// lifecycle
onMounted(() => {
  void seasonStore.fetchIllustrations();
});
</script>
