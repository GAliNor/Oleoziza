<template>
  <section class="card flex flex-col items-center px-4 pt-3 pb-10 @md:px-6">
    <button type="button" class="press flex min-h-10 cursor-pointer items-center gap-1.5 self-start rounded-control px-2 label text-fg-primary-paragraph transition-colors hover:bg-selected hover:text-fg-brand" :disabled="seasonStore.isSaving" @click="emit('cancel')">
      <arrow-left-line-icon class="h-5 w-5 rtl:-scale-x-100" />
      {{ $t('configuration.season.backToSettings') }}
    </button>
    <ui-delete-animation class="h-36 w-36 @md:h-44 @md:w-44" />
    <ui-consequences
      class="w-full"
      :title="$t('configuration.season.ask.delete', { label: season.label })"
      :lines="seasonConsequences('delete', season, seasonStore.openSeason)"
      :confirm-label="$t('configuration.season.delete')"
      :confirm-word="season.label.replace(/^\D+/, '')"
      :is-busy="seasonStore.isSaving"
      is-danger
      is-centered
      @cancel="emit('cancel')"
      @confirm="handleConfirm"
    />
  </section>
</template>

<script setup lang="ts">
// imports
import { useI18n } from 'vue-i18n';

import { useSeasonStore } from 'season/stores/season';
import { useToastStore } from 'global/stores/toast';
import { seasonConsequences } from 'configuration/composables/season-consequences';
import type { ISeason } from 'season/types/season';

import UiConsequences from 'global/components/ui-consequences.vue';
import UiDeleteAnimation from 'global/components/ui-delete-animation.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';

// props
/** The whole page given to deleting a Season: what goes, what stays, and its name typed to confirm. */
const props = defineProps<{ season: ISeason }>();

// emits
const emit = defineEmits<{ (event: 'cancel'): void; (event: 'deleted'): void }>();

// stores
const { t } = useI18n();
const seasonStore = useSeasonStore();
const toastStore = useToastStore();

// event handlers
const handleConfirm = async (): Promise<void> => {
  const { id, label } = props.season;
  if (!(await seasonStore.delete(id))) return;
  toastStore.push(t('configuration.season.deleteDone', { label }), 'success');
  emit('deleted');
};
</script>
