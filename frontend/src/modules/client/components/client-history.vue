<template>
  <section class="flex flex-col gap-3">
    <header class="flex flex-col gap-1">
      <h2 class="heading-four">{{ $t('client.history.title') }}</h2>
      <p v-if="otherSites.length" class="body-two text-fg-accent">{{ $t('client.history.otherSites', { sites: otherSites.join(', ') }) }}</p>
    </header>

    <input v-model="query" class="input" type="search" inputmode="search" :placeholder="$t('client.history.search')" />
    <div v-if="seasons.length > 1" class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      <button v-for="season in seasonChoices" :key="season.key" type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': seasonKey === season.key }" @click="seasonKey = season.key">
        {{ season.label }}
      </button>
    </div>

    <div v-if="clientStore.isLoading && !rows.length" class="flex flex-col gap-2">
      <div v-for="index in 3" :key="index" class="skeleton h-16 rounded-card" />
    </div>
    <ui-empty-state v-else-if="!shown.length" size="compact" :message="$t(rows.length ? 'client.history.noMatch' : 'client.page.noLot')" />
    <ul v-else class="flex flex-col gap-2">
      <li v-for="row in visible" :key="row.code" class="card p-0">
        <button type="button" class="flex w-full items-center gap-3 p-3 text-start" :aria-expanded="openCode === row.code" @click="openCode = openCode === row.code ? null : row.code">
          <span class="min-w-0 flex-1">
            <span class="block font-medium text-fg-display">{{ formatFullDate(row.receivedOn) }} · {{ row.variety }}</span>
            <span class="body-two block truncate tabular-nums">{{ row.code }} · {{ formatKg(row.kg) }}<template v-if="row.litres"> · {{ formatLitres(row.litres) }}</template></span>
          </span>
          <span class="flex shrink-0 flex-col items-end gap-1">
            <span class="chip bg-subtle text-fg-primary-paragraph">{{ $t(`lot.status.${row.status}`) }}</span>
            <span class="chip" :class="PAYMENT_STATE_TONES[row.paymentState]">{{ $t(`lot.payment.${row.paymentState}`) }}</span>
          </span>
        </button>
        <div v-if="openCode === row.code" class="border-t border-subtle p-3">
          <lot-detail v-if="row.lot" :lot="row.lot" />
          <dl v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt class="body-three">{{ $t('lot.register.columns.olives') }}</dt>
              <dd class="font-semibold tabular-nums">{{ formatKg(row.kg) }}</dd>
            </div>
            <div>
              <dt class="body-three">{{ $t('lot.register.columns.oil') }}</dt>
              <dd class="font-semibold tabular-nums">{{ row.litres ? formatLitres(row.litres) : '—' }}</dd>
            </div>
            <div>
              <dt class="body-three">{{ $t('lot.register.columns.yield') }}</dt>
              <dd class="font-semibold tabular-nums">{{ row.litres ? formatYield(row.litres, row.kg) : '—' }}</dd>
            </div>
            <div>
              <dt class="body-three">{{ $t('client.history.withdrawn') }}</dt>
              <dd class="font-semibold tabular-nums">{{ row.withdrawnLitres ? formatLitres(row.withdrawnLitres) : '—' }}</dd>
            </div>
          </dl>
        </div>
      </li>
    </ul>
    <button v-if="visible.length < shown.length" type="button" class="btn-secondary self-center" @click="limit += PAGE_SIZE">
      {{ $t('client.history.more', { count: shown.length - visible.length }) }}
    </button>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useClientStore } from 'client/stores/client';
import { useLotStore } from 'lot/stores/lot';
import { useSiteStore } from 'site/stores/site';
import { clientHistory, matchesHistoryQuery, seasonOf, type IClientHistoryRow } from 'client/composables/client-history';
import { formatFullDate, todayIso } from 'global/composables/date';
import { formatKg, formatLitres, formatYield } from 'lot/composables/quantity';
import { PAYMENT_STATE_TONES } from 'lot/constants/lot';
import type { IClient } from 'client/types/client';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import LotDetail from 'lot/components/lot-detail.vue';

// props
const props = defineProps<{ client: IClient; siteId: string }>();

// stores
const { t } = useI18n();
const clientStore = useClientStore();
const lotStore = useLotStore();
const siteStore = useSiteStore();

// variables
const PAGE_SIZE = 10;
const ALL = 'all';
const query = ref('');
const seasonKey = ref(ALL);
const limit = ref(PAGE_SIZE);
const openCode = ref<string | null>(null);

// computed
const rows = computed((): IClientHistoryRow[] => clientHistory(lotStore.lots, clientStore.histories[`${props.client.id}:${props.siteId}`] ?? [], props.client.id));
const seasons = computed((): string[] => [...new Set(rows.value.map((row) => row.season))]);
const seasonChoices = computed((): { key: string; label: string }[] => [
  { key: ALL, label: t('client.history.allSeasons') },
  ...seasons.value.map((season) => ({ key: season, label: season === seasonOf(todayIso()) ? t('client.history.thisSeason') : `20${season.slice(0, 2)}–20${season.slice(2)}` })),
]);
const shown = computed((): IClientHistoryRow[] => rows.value.filter((row) => (seasonKey.value === ALL || row.season === seasonKey.value) && matchesHistoryQuery(row, query.value)));
const visible = computed((): IClientHistoryRow[] => shown.value.slice(0, limit.value));
const otherSites = computed((): string[] =>
  props.client.siteIds
    .filter((siteId) => siteId !== props.siteId)
    .map((siteId) => siteStore.sites.find((site) => site.id === siteId)?.city ?? '')
    .filter(Boolean),
);

// watchers
watch([query, seasonKey], () => {
  limit.value = PAGE_SIZE;
});

watch(
  () => [props.client.id, props.siteId],
  () => {
    if (props.siteId) clientStore.fetchHistory(props.client.id, props.siteId);
  },
  { immediate: true },
);
</script>
