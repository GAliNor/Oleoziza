<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-5">
      <header class="rise flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="flex flex-col gap-1">
          <h1 class="heading-one">{{ $t('activity.title') }}</h1>
          <p class="body-two">{{ $t('activity.subtitle', { scope: scopeName }) }}</p>
        </div>
        <activity-day-bar v-model="day" />
      </header>
      <p v-if="siteStore.isAllSites" class="chip self-start bg-subtle text-fg-primary-paragraph">{{ $t('activity.pickSite') }}</p>

      <ui-empty-state v-else-if="activityStore.hasError && !summary" tone="danger" size="compact" :message="$t('activity.loadError')" />

      <div v-else-if="!summary" class="flex flex-col gap-5" aria-busy="true">
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div v-for="index in tileCount" :key="index" class="skeleton h-28 rounded-card" />
        </div>
        <div class="flex flex-col gap-2">
          <div v-for="index in 6" :key="index" class="skeleton h-16 rounded-card" />
        </div>
      </div>

      <Transition v-else :name="`day-${direction}`" mode="out-in">
        <div :key="activityStore.loadedDay ?? ''" class="flex flex-col gap-5 transition-opacity duration-200" :class="{ 'opacity-50': isDayLoading }" :aria-busy="isDayLoading">
          <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div class="card flex flex-col gap-1 p-4">
              <p class="eyebrow">{{ $t('activity.summary.receptions') }}</p>
              <p class="text-display-xs figure text-fg-display">{{ summary.receptions }}</p>
              <p class="body-two">{{ formatKg(summary.receivedKg) }}</p>
            </div>
            <div class="card flex flex-col gap-1 p-4">
              <p class="eyebrow">{{ $t('activity.summary.stored') }}</p>
              <p class="text-display-xs figure text-fg-display">{{ formatLitresRounded(summary.storedLitres) }}</p>
              <p class="body-two">{{ $t('activity.summary.storedSub') }}</p>
            </div>
            <template v-if="isFinanceShown">
              <div class="card flex flex-col gap-1 p-4">
                <p class="eyebrow">{{ $t('activity.summary.discounts') }}</p>
                <p class="text-display-xs figure text-fg-display">{{ summary.discounts }}</p>
                <p class="body-two">{{ $t('activity.summary.discountsSub', { amount: formatMoney(summary.discountDh) }) }}</p>
              </div>
              <div class="card flex flex-col gap-1 p-4">
                <p class="eyebrow">{{ $t('activity.summary.collected') }}</p>
                <p class="text-display-xs figure text-fg-display">{{ formatMoney(summary.collectedDh) }}</p>
                <p class="body-two">{{ $t('activity.summary.collectedSub') }}</p>
              </div>
            </template>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <button type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': group === ALL }" @click="group = ALL">{{ $t('activity.groups.all', { count: summary.total }) }}</button>
              <button v-for="option in groups" :key="option" type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': group === option }" @click="group = option">
                {{ $t(`activity.groups.${option}`, { count: summary.groupCounts[option] }) }}
              </button>
            </div>
            <ui-select v-model="person" class="shrink-0 sm:w-56" :options="personOptionsComputed" :label="$t('activity.byPerson')" />
          </div>

          <ui-empty-state v-if="activityStore.hasError" tone="danger" size="compact" :message="$t('activity.loadError')" />
          <ui-empty-state v-else-if="!activityStore.items.length && !activityStore.isLoading" size="compact" :message="$t(summary.total ? 'activity.noMatch' : 'activity.empty')" />
          <template v-else>
            <TransitionGroup tag="ol" name="row-in" class="card divide-y divide-default overflow-hidden p-0 transition-opacity duration-200" :class="{ 'opacity-50': isFilterLoading }">
              <li v-for="event in activityStore.items" :key="event.id">
                <activity-row :event="event" :tanks="tanks" />
              </li>
            </TransitionGroup>
            <ui-load-more :shown="activityStore.items.length" :total="activityStore.total" :is-loading="activityStore.isLoadingMore" @more="activityStore.fetchMore()" />
          </template>
        </div>
      </Transition>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useActivityStore } from 'activity/stores/activity';
import { useSiteStore } from 'site/stores/site';
import { useSiteScope } from 'site/composables/use-site-scope';
import { useSiteEquipment } from 'configuration/composables/use-site-equipment';
import { ACTIVITY_GROUPS } from 'activity/composables/activity-feed';
import { MONEY_ACTIVITY_GROUPS } from 'activity/constants/activity';
import { todayIso } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { formatKg, formatLitresRounded } from 'lot/composables/quantity';
import type { ActivityGroup, IActivityDaySummary, IActivityFilter } from 'activity/types/activity';
import type { ISelectOption } from 'global/types/select';

import AppLayout from 'global/components/app-layout.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiLoadMore from 'global/components/ui-load-more.vue';
import UiSelect from 'global/components/ui-select.vue';
import ActivityDayBar from 'activity/components/activity-day-bar.vue';
import ActivityRow from 'activity/components/activity-row.vue';

// stores
const { t } = useI18n();
const activityStore = useActivityStore();
const siteStore = useSiteStore();
const { scopeName } = useSiteScope();
const { tanks } = useSiteEquipment(() => siteStore.currentSiteId);

// variables
const ALL = 'all';
const day = ref(todayIso());
const group = ref<ActivityGroup | typeof ALL>(ALL);
const person = ref(ALL);
const direction = ref<'earlier' | 'later'>('earlier');

// computed
const isFinanceShown = computed((): boolean => siteStore.can('finance.view'));
const tileCount = computed((): number => (isFinanceShown.value ? 4 : 2));
const groups = computed((): ActivityGroup[] => ACTIVITY_GROUPS.filter((option) => isFinanceShown.value || !MONEY_ACTIVITY_GROUPS.includes(option)));
const summary = computed((): IActivityDaySummary | null => activityStore.summary);
const personOptionsComputed = computed((): ISelectOption[] => [{ value: ALL, label: t('activity.everyone') }, ...(summary.value?.people ?? []).map((name) => ({ value: name, label: name }))]);
const isDayLoading = computed((): boolean => activityStore.isLoading && activityStore.query?.day !== activityStore.loadedDay);
const isFilterLoading = computed((): boolean => activityStore.isLoading && !isDayLoading.value);
const filter = computed((): IActivityFilter => ({ group: group.value === ALL ? null : group.value, person: person.value === ALL ? null : person.value, includeMoney: isFinanceShown.value }));

// watchers
watch(day, (next, previous) => {
  direction.value = next < previous ? 'earlier' : 'later';
  person.value = ALL;
});

watch(
  [() => siteStore.currentSiteId, day],
  ([siteId, value]) => {
    if (siteId && !siteStore.isAllSites && value) activityStore.fetchDay(siteId, value, filter.value);
  },
  { immediate: true },
);

watch([group, person], () => activityStore.fetchFiltered(filter.value));
</script>
