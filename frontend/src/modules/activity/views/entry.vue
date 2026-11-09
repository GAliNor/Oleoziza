<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-5">
      <header class="rise flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="flex flex-col gap-1">
          <p class="caption tracking-wide text-fg-muted uppercase">{{ formatDayDate(`${day}T12:00:00`) }}</p>
          <h1 class="heading-one">{{ $t('activity.title') }}</h1>
          <p class="body-two">{{ $t('activity.subtitle', { scope: scopeName }) }}</p>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" class="icon-btn" :aria-label="$t('activity.previousDay')" @click="handleShift(-1)">
            <arrow-left-line-icon class="h-5 w-5" />
          </button>
          <input v-model="day" class="input w-40" type="date" :max="todayIso()" :aria-label="$t('activity.pickDay')" />
          <button type="button" class="icon-btn" :disabled="day >= todayIso()" :aria-label="$t('activity.nextDay')" @click="handleShift(1)">
            <arrow-right-line-icon class="h-5 w-5" />
          </button>
          <button v-if="day !== todayIso()" type="button" class="link ms-1" @click="day = todayIso()">{{ $t('activity.today') }}</button>
        </div>
      </header>
      <p v-if="siteStore.isAllSites" class="chip self-start bg-subtle text-fg-primary-paragraph">{{ $t('activity.pickSite') }}</p>

      <template v-else>
        <div class="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            <button type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': group === ALL }" @click="group = ALL">{{ $t('activity.groups.all', { count: allowed.length }) }}</button>
            <button v-for="option in groups" :key="option" type="button" class="choice-chip shrink-0" :class="{ 'choice-chip-active': group === option }" @click="group = option">
              {{ $t(`activity.groups.${option}`, { count: allowed.filter((event) => event.group === option).length }) }}
            </button>
          </div>
          <select v-model="person" class="input sm:w-56" :aria-label="$t('activity.byPerson')">
            <option :value="ALL">{{ $t('activity.everyone') }}</option>
            <option v-for="name in people" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>

        <div v-if="activityStore.isLoading && !activityStore.items.length" class="flex flex-col gap-2">
          <div v-for="index in 6" :key="index" class="skeleton h-16 rounded-card" />
        </div>
        <ui-empty-state v-else-if="activityStore.hasError" tone="danger" size="compact" :message="$t('activity.loadError')" />
        <ui-empty-state v-else-if="!shown.length" size="compact" :message="$t(allowed.length ? 'activity.noMatch' : 'activity.empty')" />
        <ol v-else class="card divide-y divide-default overflow-hidden p-0">
          <li v-for="event in shown" :key="event.id">
            <component :is="event.to ? 'router-link' : 'div'" :to="event.to ?? undefined" class="flex items-center gap-3 px-4 py-3" :class="{ 'hover:bg-subtle': event.to }">
              <span class="w-12 shrink-0 body-two tabular-nums">{{ formatTime(event.at) }}</span>
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full" :class="GROUP_TONES[event.group]">
                <component :is="GROUP_ICONS[event.group]" class="h-4.5 w-4.5" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium text-fg-display">{{ titleOf(event) }}</span>
                <span class="body-two block truncate">{{ subjectOf(event) }} · {{ $t('activity.by', { name: event.by }) }}</span>
              </span>
              <span v-if="figureOf(event)" class="shrink-0 figure text-fg-display">{{ figureOf(event) }}</span>
            </component>
          </li>
        </ol>
      </template>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch, type Component } from 'vue';
import { useI18n } from 'vue-i18n';

import { useActivityStore } from 'activity/stores/activity';
import { useSiteStore } from 'site/stores/site';
import { useSiteScope } from 'site/composables/use-site-scope';
import { useSiteEquipment } from 'configuration/composables/use-site-equipment';
import { ACTIVITY_GROUPS, daySummary } from 'activity/composables/activity-feed';
import { formatTank } from 'configuration/composables/equipment';
import { formatDayDate, formatFullDate, formatTime, shiftDate, todayIso } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { formatKg, formatLitresRounded } from 'lot/composables/quantity';
import type { ActivityGroup, IActivity } from 'activity/types/activity';

import AppLayout from 'global/components/app-layout.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';
import CoinsLineIcon from 'global/icons/coins-line.icon.vue';
import DropLineIcon from 'global/icons/drop-line.icon.vue';
import PercentLineIcon from 'global/icons/percent-line.icon.vue';
import PhoneLineIcon from 'global/icons/phone-line.icon.vue';
import ScaleLineIcon from 'global/icons/scale-line.icon.vue';
import SlidersLineIcon from 'global/icons/sliders-line.icon.vue';

// stores
const { t } = useI18n();
const activityStore = useActivityStore();
const siteStore = useSiteStore();
const { scopeName } = useSiteScope();
const { tanks } = useSiteEquipment(() => siteStore.currentSiteId);

// variables
const ALL = 'all';
const GROUP_ICONS: Record<ActivityGroup, Component> = {
  production: ScaleLineIcon,
  storage: DropLineIcon,
  discount: PercentLineIcon,
  payment: CoinsLineIcon,
  follow: PhoneLineIcon,
  configuration: SlidersLineIcon,
};
const GROUP_TONES: Record<ActivityGroup, string> = {
  production: 'bg-selected text-fg-brand',
  storage: 'bg-accent-subtle text-fg-accent',
  discount: 'bg-warning-subtle text-fg-warning',
  payment: 'bg-success-subtle text-fg-success',
  follow: 'bg-info-subtle text-fg-info',
  configuration: 'bg-subtle text-fg-primary-paragraph',
};
const day = ref(todayIso());
const group = ref<ActivityGroup | typeof ALL>(ALL);
const person = ref(ALL);

// computed
const isFinanceShown = computed((): boolean => siteStore.can('finance.view'));
const groups = computed((): ActivityGroup[] => ACTIVITY_GROUPS.filter((option) => isFinanceShown.value || !['discount', 'payment', 'follow'].includes(option)));
const allowed = computed((): IActivity[] => activityStore.items.filter((event) => isFinanceShown.value || !event.isMoney));
const people = computed((): string[] => [...new Set(allowed.value.map((event) => event.by))].sort((first, second) => first.localeCompare(second)));
const shown = computed((): IActivity[] => allowed.value.filter((event) => (group.value === ALL || event.group === group.value) && (person.value === ALL || event.by === person.value)));
const summary = computed(() => daySummary(allowed.value));

// watchers
watch(
  [() => siteStore.currentSiteId, day],
  ([siteId, value]) => {
    if (siteId && !siteStore.isAllSites && value) activityStore.fetchDay(siteId, value);
  },
  { immediate: true },
);

// methods
const tankLabel = (tankId: string | number | undefined): string => {
  const tank = tanks.value.find((item) => item.id === tankId);
  return tank ? formatTank(tank) : String(tankId ?? '');
};

const titleOf = (event: IActivity): string =>
  t(`activity.kinds.${event.kind}`, {
    ...event.params,
    method: event.params.method ? t(`finance.methods.${event.params.method}`) : '',
    tank: tankLabel(event.params.tankId),
    contact: event.params.contact ? t(`finance.debts.kinds.${event.params.contact}`) : '',
    setting: event.params.key ? t(`activity.settings.${event.params.key}`) : '',
  });

const subjectOf = (event: IActivity): string => {
  if (event.kind === 'configuration') return t('activity.settingsSubject');
  if (event.kind === 'debt_contact' && event.params.promisedOn) return `${event.subject} · ${t('activity.promised', { date: formatFullDate(String(event.params.promisedOn)) })}`;
  return event.subject;
};

const figureOf = (event: IActivity): string => {
  if (event.amount !== null) return formatMoney(event.amount);
  if (event.litres !== null) return formatLitresRounded(event.litres);
  return event.kg !== null ? formatKg(event.kg) : '';
};

// event handlers
const handleShift = (days: number): void => {
  const next = shiftDate(day.value, days);
  if (next <= todayIso()) day.value = next;
};
</script>
