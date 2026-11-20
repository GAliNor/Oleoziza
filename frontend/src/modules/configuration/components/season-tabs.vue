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
    <div v-if="canManage && selected && selected.status !== 'closed'" class="flex flex-wrap items-center gap-2">
      <ui-confirm-button
        v-if="selected.status === 'planned'"
        :label="$t('configuration.season.open')"
        :confirm-label="seasonStore.openSeason ? $t('configuration.season.openConfirm', { current: seasonStore.openSeason.label }) : $t('configuration.season.openConfirmAlone')"
        :is-disabled="isLocked"
        @confirm="handleOpen"
      />
      <ui-confirm-button
        v-else
        :label="$t('configuration.season.close')"
        :confirm-label="$t('configuration.season.closeConfirm')"
        :is-disabled="isLocked"
        @confirm="handleClose"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, defineAsyncComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSeasonStore } from 'season/stores/season';
import { useToastStore } from 'global/stores/toast';
import type { ISeason } from 'season/types/season';

import UiConfirmButton from 'global/components/ui-confirm-button.vue';

const SeasonIllustrationPicker = defineAsyncComponent(() => import('season/components/season-illustration-picker.vue'));

// props
const props = defineProps<{ modelValue: string | null; canManage: boolean; isLocked: boolean }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', seasonId: string): void; (event: 'changed'): void }>();

// stores
const seasonStore = useSeasonStore();
const toastStore = useToastStore();
const { t } = useI18n();

// variables
const isPreparing = ref(false);
const pickedIllustrationId = ref<string | null | undefined>(undefined);

// computed
const selected = computed((): ISeason | undefined => seasonStore.findSeason(props.modelValue));
const nextLabel = computed((): string => {
  const latest = seasonStore.seasons.at(-1);
  const year = latest ? Number(latest.startsOn.slice(0, 4)) + 1 : new Date().getFullYear();
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
const shortLabel = (season: ISeason): string => `${season.startsOn.slice(0, 4)}-${Number(season.startsOn.slice(0, 4)) + 1}`;
const notify = (season: ISeason | null, successKey: string): void => {
  if (season) toastStore.push(t(successKey, { label: season.label }), 'success');
  else toastStore.push(t('configuration.saveError'), 'danger');
};

// event handlers
const handlePrepare = async (): Promise<void> => {
  const season = await seasonStore.prepareNext(pickedIllustrationIdComputed.value);
  notify(season, 'configuration.season.prepared');
  if (!season) return;
  isPreparing.value = false;
  pickedIllustrationId.value = undefined;
  emit('update:modelValue', season.id);
};
const handleOpen = async (): Promise<void> => {
  if (!props.modelValue) return;
  const season = await seasonStore.open(props.modelValue);
  notify(season, 'configuration.season.opened');
  if (season) emit('changed');
};
const handleClose = async (): Promise<void> => {
  if (!props.modelValue) return;
  const season = await seasonStore.close(props.modelValue);
  notify(season, 'configuration.season.closed');
  if (season) emit('changed');
};
</script>
