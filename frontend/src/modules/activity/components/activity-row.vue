<template>
  <component :is="event.to ? 'router-link' : 'div'" :to="event.to ?? undefined" class="flex items-center gap-3 px-4 py-3" :class="{ 'transition-colors hover:bg-subtle': event.to }">
    <span class="w-12 shrink-0 body-two tabular-nums">{{ formatTime(event.at) }}</span>
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full" :class="ACTIVITY_GROUP_TONES[event.group]">
      <component :is="ACTIVITY_GROUP_ICONS[event.group]" class="h-4.5 w-4.5" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block font-medium text-pretty text-fg-display">{{ titleComputed }}</span>
      <span class="body-two block truncate">{{ subjectComputed ? `${subjectComputed} · ` : '' }}{{ $t('activity.by', { name: event.by }) }}</span>
    </span>
    <span v-if="figureComputed" class="shrink-0 figure text-fg-display">{{ figureComputed }}</span>
  </component>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { activitySubject, activityTitle } from 'activity/composables/activity-text';
import { formatTime } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { formatKg, formatLitresRounded } from 'lot/composables/quantity';
import { ACTIVITY_GROUP_ICONS, ACTIVITY_GROUP_TONES } from 'activity/constants/activity';
import type { IActivity } from 'activity/types/activity';

// props
const props = defineProps<{ event: IActivity }>();

// computed
const titleComputed = computed((): string => activityTitle(props.event));
const subjectComputed = computed((): string => activitySubject(props.event));
const figureComputed = computed((): string => {
  const { event } = props;
  if (event.amount !== null) return formatMoney(event.amount);
  if (event.litres !== null) return formatLitresRounded(event.litres);
  return event.kg !== null ? formatKg(event.kg) : '';
});
</script>
