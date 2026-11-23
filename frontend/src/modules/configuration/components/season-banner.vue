<template>
  <div class="flex flex-col gap-3">
    <article class="card relative overflow-hidden p-0">
      <season-art :season="season" frame-class="h-48 md:h-56" :is-sketch-noted="canManage" />
      <div class="absolute inset-y-0 start-0 flex w-full flex-col justify-end bg-linear-to-r rtl:bg-linear-to-l from-(--background-color-surface)/90 via-(--background-color-surface)/55 to-transparent p-5 md:w-3/5">
        <div class="flex flex-col gap-1">
          <h2 class="display-md text-fg-display">{{ season.label }}</h2>
          <p class="body-two text-fg-primary-paragraph tabular-nums">{{ dates }}</p>
        </div>
      </div>
      <div v-if="canManage" class="absolute end-3 top-3">
        <button type="button" class="btn-secondary bg-surface/90 py-1 text-xs" :aria-expanded="isPicking" :disabled="isLocked" @click="isPicking = !isPicking">
          <image-line-icon class="h-4 w-4" />
          {{ $t('configuration.season.art.change') }}
        </button>
      </div>
    </article>
    <div v-if="canManage && isPicking" class="card p-4">
      <season-illustration-picker :model-value="season.seasonIllustrationId" :season-code="season.code" :is-disabled="isLocked" @update:model-value="handleChoose" />
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, defineAsyncComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSeasonStore } from 'season/stores/season';
import { useToastStore } from 'global/stores/toast';
import { formatShortDate } from 'global/composables/date';
import { seasonEnd } from 'configuration/composables/season-dates';
import type { ISeason } from 'season/types/season';

import SeasonArt from 'season/components/season-art.vue';
import ImageLineIcon from 'global/icons/image-line.icon.vue';

const SeasonIllustrationPicker = defineAsyncComponent(() => import('season/components/season-illustration-picker.vue'));

// props
const props = defineProps<{ season: ISeason; canManage: boolean; isLocked: boolean }>();

// stores
const seasonStore = useSeasonStore();
const toastStore = useToastStore();
const { t } = useI18n();

// variables
const isPicking = ref(false);

// computed
const dates = computed((): string => `${formatShortDate(`${props.season.startsOn}T12:00:00Z`)} → ${formatShortDate(`${seasonEnd(props.season)}T12:00:00Z`)}`);


// event handlers
const handleChoose = async (seasonIllustrationId: string | null): Promise<void> => {
  const season = await seasonStore.chooseIllustration(props.season.id, seasonIllustrationId);
  toastStore.push(season ? t('configuration.season.art.chosen') : t('configuration.season.art.chooseError'), season ? 'success' : 'danger');
  if (season) isPicking.value = false;
};
</script>
