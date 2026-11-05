<template>
  <router-link :to="task.to" class="press group flex min-h-18 items-center gap-3 px-4 py-3.5 sm:gap-4 transition-colors hover:bg-subtle focus-visible:bg-subtle sm:px-5">
    <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11" :class="TASK_GROUP_TONES[task.group]">
      <component :is="TASK_ICONS[task.kind]" class="h-5 w-5" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="line-clamp-2 font-medium text-fg-display sm:truncate">{{ $t(`task.kinds.${task.kind}.title`, task.params) }}</span>
      <span class="line-clamp-2 body-two sm:truncate">
        {{ task.subject }}<template v-if="detail"> · {{ detail }}</template><template v-if="task.at"> · {{ since }}</template>
      </span>
    </span>
    <span v-if="task.amount !== null" class="shrink-0 font-medium text-fg-display tabular-nums">{{ formatMoney(task.amount) }}</span>
    <chevron-right-line-icon class="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-300 ease-(--ease-premium) group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
  </router-link>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { daysSince } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { TASK_GROUP_TONES, TASK_ICONS } from 'task/constants/task';
import type { ITask } from 'task/types/task';

import ChevronRightLineIcon from 'global/icons/chevron-right-line.icon.vue';

// props
const props = defineProps<{ task: ITask }>();

// stores
const { t, te } = useI18n();

// computed
const detail = computed((): string => {
  const key = `task.kinds.${props.task.kind}.detail`;
  return te(key) ? t(key, props.task.params) : '';
});
const since = computed((): string => t('task.since', daysSince(props.task.at ?? '')));
</script>
