<template>
  <div class="flex items-stretch">
    <router-link :to="task.to" class="press group flex min-h-18 min-w-0 flex-1 items-center gap-3 px-4 py-3.5 sm:gap-4 transition-colors hover:bg-subtle focus-visible:bg-subtle sm:px-5">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-card sm:h-11 sm:w-11" :class="isLate(task) ? 'bg-danger-subtle text-fg-danger' : TASK_GROUP_TONES[task.group]">
        <component :is="TASK_ICONS[task.kind]" class="h-5 w-5" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="line-clamp-2 font-medium sm:truncate" :class="isLate(task) ? 'text-fg-danger' : 'text-fg-display'">{{ taskTitle(task) }}</span>
        <span class="line-clamp-2 body-two sm:truncate">{{ taskDetail(task) }}</span>
      </span>
      <span v-if="task.amount !== null" class="shrink-0 font-medium text-fg-display tabular-nums">{{ formatMoney(task.amount) }}</span>
      <chevron-right-line-icon class="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-300 ease-(--ease-premium) group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
    </router-link>
    <div v-if="task.action" class="flex shrink-0 items-center border-s border-default px-3">
      <router-link :to="task.action.to" class="btn-secondary min-h-10 px-4">{{ $t(task.action.labelKey) }}</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { formatMoney } from 'global/composables/money';
import { isLate, taskDetail, taskTitle } from 'task/composables/task-text';
import { TASK_GROUP_TONES, TASK_ICONS } from 'task/constants/task';
import type { ITask } from 'task/types/task';

import ChevronRightLineIcon from 'global/icons/chevron-right-line.icon.vue';

// props
defineProps<{ task: ITask }>();
</script>
