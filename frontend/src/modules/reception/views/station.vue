<template>
  <app-layout>
    <reception-done v-if="finishedLot" :lot="finishedLot" />

    <div v-else-if="receptionStore.isLoading && !lot" class="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div class="skeleton h-12" />
      <div class="skeleton h-48 rounded-card" />
    </div>

    <ui-empty-state v-else-if="!lot" size="page" :message="$t('reception.station.notFound')">
      <template #action>
        <router-link :to="{ name: 'dashboard' }" class="btn-secondary">{{ $t('reception.station.back') }}</router-link>
      </template>
    </ui-empty-state>

    <section v-else class="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <nav v-if="lotStore.receivedLots.length > 1" class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" :aria-label="$t('reception.station.otherLots')">
        <router-link
          v-for="item in lotStore.receivedLots"
          :key="item.id"
          :to="{ name: 'reception-station', params: { code: item.code } }"
          replace
          class="flex shrink-0 flex-col rounded-card border px-3 py-2 transition-colors"
          :class="item.id === lot.id ? 'border-brand bg-selected/50' : 'border-default bg-surface'"
        >
          <span class="heading-six">{{ item.clientName }}</span>
          <span class="body-two tabular-nums">{{ item.code }} · {{ formatKg(item.netKg) }}</span>
        </router-link>
      </nav>

      <div class="grid gap-4 md:grid-cols-[1fr_22rem] md:items-start">
        <station-lot-card :lot="lot" />
        <weighing-panel :lot="lot" :site-id="siteId" @finish="handleFinish" />
        <weighing-history :lot="lot" />
      </div>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { useLotStore } from 'lot/stores/lot';
import { useReceptionStore } from 'reception/stores/reception';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { formatKg } from 'lot/composables/quantity';
import type { ILot } from 'lot/types/lot';

import AppLayout from 'global/components/app-layout.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import ReceptionDone from 'reception/components/reception-done.vue';
import StationLotCard from 'reception/components/station-lot-card.vue';
import WeighingHistory from 'reception/components/weighing-history.vue';
import WeighingPanel from 'reception/components/weighing-panel.vue';

// stores
const { t } = useI18n();
const route = useRoute();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const receptionStore = useReceptionStore();
const lotStore = useLotStore();

// variables
const finishedLot = ref<ILot | null>(null);

// computed
const siteId = computed((): string => siteStore.currentSite?.id ?? '');
const lot = computed((): ILot | undefined => {
  const found = lotStore.lotByCode(String(route.params.code));
  return found?.status === 'received' ? found : undefined;
});

// watchers
watch(
  siteId,
  (value) => {
    if (value) receptionStore.fetchSite(value);
  },
  { immediate: true },
);

watch(
  () => route.params.code,
  () => {
    finishedLot.value = null;
  },
);

// event handlers
const handleFinish = async (): Promise<void> => {
  if (!lot.value) return;
  const updated = await receptionStore.finishReception(lot.value);
  if (!updated) {
    toastStore.push(t('reception.saveError'), 'danger');
    return;
  }
  finishedLot.value = updated;
};
</script>
