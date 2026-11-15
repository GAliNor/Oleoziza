<template>
  <component :is="event.to ? 'router-link' : 'div'" :to="event.to ?? undefined" class="flex items-center gap-3 px-4 py-3" :class="{ 'transition-colors hover:bg-subtle': event.to }">
    <span class="w-12 shrink-0 body-two tabular-nums">{{ formatTime(event.at) }}</span>
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full" :class="ACTIVITY_GROUP_TONES[event.group]">
      <component :is="ACTIVITY_GROUP_ICONS[event.group]" class="h-4.5 w-4.5" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate font-medium text-fg-display">{{ title }}</span>
      <span class="body-two block truncate">{{ subject }} · {{ $t('activity.by', { name: event.by }) }}</span>
    </span>
    <span v-if="figure" class="shrink-0 figure text-fg-display">{{ figure }}</span>
  </component>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatTank } from 'configuration/composables/equipment';
import { formatFullDate, formatTime } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { formatKg, formatLitresRounded } from 'lot/composables/quantity';
import { ACTIVITY_GROUP_ICONS, ACTIVITY_GROUP_TONES } from 'activity/constants/activity';
import type { ITankSetting } from 'configuration/types/configuration';
import type { IActivity } from 'activity/types/activity';

// props
const props = defineProps<{ event: IActivity; tanks: ITankSetting[] }>();

// stores
const { t } = useI18n();

// computed
const title = computed((): string => {
  const { params } = props.event;
  const tank = props.tanks.find((item) => item.id === params.tankId);
  return t(`activity.kinds.${props.event.kind}`, {
    ...params,
    method: params.method ? t(`finance.methods.${params.method}`) : '',
    tank: tank ? formatTank(tank) : String(params.tankId ?? ''),
    contact: params.contact ? t(`finance.debts.kinds.${params.contact}`) : '',
    setting: params.key ? t(`activity.settings.${params.key}`) : '',
    category: params.category ? t(`expense.categories.${params.category}`) : '',
  });
});
const subject = computed((): string => {
  const { event } = props;
  if (event.kind === 'configuration') return t('activity.settingsSubject');
  if (event.kind === 'debt_contact' && event.params.promisedOn) return `${event.subject} · ${t('activity.promised', { date: formatFullDate(String(event.params.promisedOn)) })}`;
  return event.subject;
});
const figure = computed((): string => {
  const { event } = props;
  if (event.amount !== null) return formatMoney(event.amount);
  if (event.litres !== null) return formatLitresRounded(event.litres);
  return event.kg !== null ? formatKg(event.kg) : '';
});
</script>
