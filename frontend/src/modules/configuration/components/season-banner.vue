<template>
  <article class="card relative overflow-hidden p-0">
    <season-art :season="season" frame-class="h-48 md:h-56" :is-sketch-noted="canManage" />
    <div class="absolute inset-y-0 start-0 flex w-full flex-col justify-between bg-linear-to-r rtl:bg-linear-to-l from-(--background-color-surface)/90 via-(--background-color-surface)/55 to-transparent p-5 md:w-3/5">
      <div class="flex flex-col gap-1">
        <p class="eyebrow">{{ $t(`season.status.${season.status}`) }} · {{ dates }}</p>
        <h2 class="display-md text-fg-display">{{ season.label }}</h2>
      </div>
      <dl v-if="configuration" class="flex flex-wrap gap-x-6 gap-y-2">
        <div v-for="setting in CONFIGURATION_VALUES" :key="setting.key">
          <dt class="caption text-fg-muted">{{ $t(`configuration.values.${setting.key}.title`) }}</dt>
          <dd class="heading-three tabular-nums">{{ formatValue(setting.key, configuration[setting.key]) }}</dd>
        </div>
      </dl>
    </div>
    <div v-if="canManage" class="absolute end-3 top-3 flex gap-2">
      <label v-for="variant in VARIANTS" :key="variant" class="btn-secondary cursor-pointer bg-surface/90 py-1 text-xs" :class="{ 'pointer-events-none opacity-60': isLocked }">
        <image-line-icon class="h-4 w-4" />
        {{ $t(`configuration.season.art.${variant}`) }}
        <input type="file" class="sr-only" accept="image/webp,image/png,image/jpeg" :disabled="isLocked" @change="handleFile(variant, $event)" />
      </label>
    </div>
  </article>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSeasonStore } from 'season/stores/season';
import { useToastStore } from 'global/stores/toast';
import { formatShortDate } from 'global/composables/date';
import { formatNumber } from 'global/composables/number';
import { seasonEnd } from 'configuration/composables/season-agenda';
import { CONFIGURATION_VALUES } from 'configuration/constants/configuration';
import type { ConfigurationValueKey, IConfiguration } from 'configuration/types/configuration';
import type { ISeason, SeasonArtVariant } from 'season/types/season';

import SeasonArt from 'season/components/season-art.vue';
import ImageLineIcon from 'global/icons/image-line.icon.vue';

// props
const props = defineProps<{ season: ISeason; configuration?: IConfiguration; canManage: boolean; isLocked: boolean }>();

// stores
const seasonStore = useSeasonStore();
const toastStore = useToastStore();
const { t } = useI18n();

// variables
const VARIANTS: SeasonArtVariant[] = ['light', 'dark'];

// computed
const dates = computed((): string => `${formatShortDate(`${props.season.startsOn}T12:00:00Z`)} → ${formatShortDate(`${seasonEnd(props.season)}T12:00:00Z`)}`);

// methods
const formatValue = (key: ConfigurationValueKey, value: number): string => {
  const setting = CONFIGURATION_VALUES.find((item) => item.key === key);
  const digits = key === 'millingRate' ? 2 : 0;
  return `${formatNumber(value, 2, digits)} ${t(`configuration.units.${setting?.unitKey ?? 'perKg'}`)}`;
};

// event handlers
const handleFile = async (variant: SeasonArtVariant, event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const season = await seasonStore.uploadIllustration(props.season.id, variant, file);
  toastStore.push(season ? t('configuration.season.art.uploaded') : t('configuration.season.art.uploadError'), season ? 'success' : 'danger');
};
</script>
