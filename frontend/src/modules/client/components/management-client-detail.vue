<template>
  <section class="@container flex min-w-0 flex-col gap-6">
    <div class="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:justify-between">
      <h3 class="heading-three">{{ $t('client.record.activity') }}</h3>
      <ui-segmented class="self-start" :model-value="periodKey" :options="periodOptions" :label="$t('global.period.label')" @update:model-value="handleSelectPeriod" />
    </div>

    <div class="grid grid-cols-2 gap-4" :class="isFinanceShown ? '@2xl:grid-cols-3' : '@2xl:grid-cols-4'">
      <template v-if="periodLots.length">
        <ui-stat-tile :label="$t('client.record.lots')" :value="activity.lots" />
        <ui-stat-tile :label="$t('client.record.olives')" :value="activity.oliveKg" :unit="$t('global.units.kilogram')" />
        <ui-stat-tile
          :label="$t('client.record.oil')"
          :value="activity.oilLitres"
          :unit="$t('global.units.litre')"
        />
        <ui-stat-tile :label="$t('client.record.yield')" :value="yieldValue" :decimals="1" :unit="$t('global.units.litrePerQuintal')" />
        <ui-stat-tile v-if="isFinanceShown" :label="$t('client.record.generated')" :value="activity.generatedDh" :format="formatMoney" />
      </template>
      <ui-stat-tile
        v-if="isFinanceShown"
        :label="$t('client.record.owes')"
        :value="client.balance"
        :format="formatMoney"
        :value-class="client.balance ? 'text-fg-warning' : 'text-fg-display'"
        :sub="$t('client.record.owesOfTotal', { amount: formatMoney(totalGeneratedDh) })"
      />
    </div>

    <div v-if="!periodLots.length" class="card p-0">
      <ui-empty-state size="page" :message="$t('client.record.noActivity')" />
    </div>

    <template v-else>

      <div class="card flex flex-col gap-5 p-6 lg:p-8">
        <h4 class="heading-four">{{ $t('client.record.bySite') }}</h4>
        <ul class="flex flex-col divide-y divide-subtle">
          <li v-for="site in consumption" :key="site.siteId" class="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
            <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p class="heading-five">{{ site.siteName }}</p>
              <p class="figure text-lg text-fg-display">
                {{ formatKg(site.oliveKg) }}
                <span v-if="isMultiSite" class="body-two font-normal">· {{ site.sharePercent }} %</span>
              </p>
            </div>
            <ui-progress-bar v-if="isMultiSite" class="h-1.5" :value="site.sharePercent" :label="$t('client.record.share', { name: site.siteName })" />
            <div class="body-two flex flex-wrap justify-between gap-x-6 gap-y-1 tabular-nums">
              <span>
                {{ $t('client.record.lotCount', site.lots) }} · {{ formatOil(site.oilLitres) }}
                <template v-if="isFinanceShown">· {{ $t('client.record.generatedAmount', { amount: formatMoney(site.generatedDh) }) }}</template>
              </span>
              <span>
                {{ $t('client.record.stockNow', { quantity: site.oilStockLitres ? formatLitres(site.oilStockLitres) : '—' }) }}
                <template v-if="isFinanceShown">
                  · <span :class="{ 'text-fg-warning': site.balance }">{{ $t('client.record.owesNow', { amount: site.balance ? formatMoney(site.balance) : '—' }) }}</span>
                </template>
              </span>
            </div>
          </li>
        </ul>
      </div>

      <div class="card flex flex-col gap-5 p-6 lg:p-8">
        <h4 class="heading-four">{{ $t('client.record.history') }}</h4>
        <ul class="flex flex-col divide-y divide-subtle">
          <li v-for="lot in pageRows" :key="lot.code" class="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="font-medium text-fg-display tabular-nums">{{ lot.code }}</span>
              <span class="body-two">{{ lot.siteName }} · {{ formatOliveKg(lot.kg) }} · {{ formatOil(lot.oilLitres) }}</span>
            </span>
            <span class="flex shrink-0 flex-col items-end gap-1">
              <span class="chip bg-subtle text-fg-primary-paragraph">{{ $t(`lot.status.${lot.status}`) }}</span>
              <span class="body-three">{{ receivedLabel(lot.receivedOn) }}</span>
            </span>
          </li>
        </ul>
        <ui-pagination v-model:page="page" :page-count="pageCount" :total="periodLots.length" :page-size="PAGE_SIZE" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { daysSince, formatFullDate } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { usePagedRows } from 'global/composables/use-paged-rows';
import { formatKg, formatLitres, formatOil, formatOliveKg, yieldPerQuintal } from 'lot/composables/quantity';
import { lotsInPeriod, siteConsumption, summarizeActivity } from 'client/composables/client-activity';
import type { ClientPeriodKey, IClientActivity, IClientLotLine, IClientRecord, ISiteConsumption } from 'client/types/client';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import UiProgressBar from 'global/components/ui-progress-bar.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import UiStatTile from 'global/components/ui-stat-tile.vue';

// props
const props = defineProps<{ client: IClientRecord; isFinanceShown: boolean }>();

// stores
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// variables
const DEFAULT_PERIOD: ClientPeriodKey = 'all';
const CLIENT_PERIODS: ClientPeriodKey[] = [DEFAULT_PERIOD, 'season', 'previous', 'month', 'week'];
const PAGE_SIZE = 8;
const RELATIVE_DATE_DAYS = 30;

// computed
const periodOptions = computed((): { key: ClientPeriodKey; label: string }[] =>
  CLIENT_PERIODS.map((key) => ({ key, label: key === 'all' ? t('client.record.allTime') : t(`global.period.${key}.label`) })),
);
const periodKey = computed((): ClientPeriodKey => CLIENT_PERIODS.find((key) => key === route.query.period) ?? DEFAULT_PERIOD);
const periodLots = computed((): IClientLotLine[] => lotsInPeriod(props.client.history, periodKey.value));
const activity = computed((): IClientActivity => summarizeActivity(periodLots.value));
const totalGeneratedDh = computed((): number => summarizeActivity(props.client.history).generatedDh);
const yieldValue = computed((): number => yieldPerQuintal(activity.value.oilLitres, activity.value.oliveKg));
const consumption = computed((): ISiteConsumption[] => siteConsumption(periodLots.value, props.client.sites));
const isMultiSite = computed((): boolean => props.client.sites.length > 1);
const { page, pageCount, pageRows } = usePagedRows(periodLots, PAGE_SIZE);

// watchers
watch(periodKey, () => {
  page.value = 1;
});

// methods
const receivedLabel = (receivedOn: string): string => {
  const days = daysSince(receivedOn);
  if (days === 0) return t('client.record.today');
  if (days === 1) return t('client.record.yesterday');
  return days < RELATIVE_DATE_DAYS ? t('client.record.daysAgo', { count: days }) : formatFullDate(receivedOn);
};

// event handlers
const handleSelectPeriod = (key: ClientPeriodKey): void => {
  router.replace({ query: { ...route.query, period: key === DEFAULT_PERIOD ? undefined : key } });
};
</script>
