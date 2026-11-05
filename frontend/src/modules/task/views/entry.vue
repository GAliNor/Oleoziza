<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-8">
      <header class="rise flex flex-col gap-1.5">
        <p class="caption tracking-wide text-fg-muted uppercase">{{ today }}</p>
        <h1 class="heading-one">{{ $t('task.title') }}</h1>
        <p class="body-two">{{ tasks.length ? $t('task.subtitle', { scope: scopeName, count: tasks.length }) : scopeName }}</p>
      </header>

      <div v-if="isLoading" class="flex flex-col gap-3">
        <div v-for="index in 4" :key="index" class="skeleton h-18 rounded-card" />
      </div>

      <div v-else-if="!groups.length" class="rise card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span class="grid h-16 w-16 place-items-center rounded-full bg-selected text-fg-brand">
          <check-circle-line-icon class="check-pop h-8 w-8" />
        </span>
        <div class="flex flex-col gap-1">
          <p class="heading-three">{{ $t('task.empty.title') }}</p>
          <p class="body-two">{{ $t('task.empty.body') }}</p>
        </div>
      </div>

      <div v-else class="stagger flex flex-col gap-8">
        <section v-for="entry in groups" :key="entry.group" class="flex flex-col gap-3" :aria-labelledby="`task-group-${entry.group}`">
          <h2 :id="`task-group-${entry.group}`" class="flex items-center gap-2 px-1 label text-fg-secondary-paragraph">
            {{ $t(`task.groups.${entry.group}`) }}
            <span class="rounded-full bg-subtle px-2 text-xs tabular-nums">{{ entry.tasks.length }}</span>
          </h2>
          <ul class="card divide-y divide-default overflow-hidden p-0">
            <li v-for="task in entry.tasks" :key="task.id">
              <task-row :task="task" />
            </li>
          </ul>
        </section>
      </div>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';

import { useSiteStore } from 'site/stores/site';
import { useSiteScope } from 'site/composables/use-site-scope';
import { formatDayDate } from 'global/composables/date';
import { useTasks } from 'task/composables/use-tasks';

import AppLayout from 'global/components/app-layout.vue';
import TaskRow from 'task/components/task-row.vue';
import CheckCircleLineIcon from 'global/icons/check-circle-line.icon.vue';

// stores
const siteStore = useSiteStore();
const { scopeName } = useSiteScope();
const { tasks, groups, load } = useTasks();

// variables
const isLoading = ref(true);

// computed
const today = computed((): string => formatDayDate(new Date().toISOString()));

// methods
const refresh = async (): Promise<void> => {
  isLoading.value = !tasks.value.length;
  await load();
  isLoading.value = false;
};

// watchers
watch(() => siteStore.currentSiteId, refresh, { immediate: true });
</script>
