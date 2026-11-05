<template>
  <details class="border-t border-subtle pt-3">
    <summary class="cursor-pointer body-two">{{ $t('configuration.history.title', { count: changes.length }) }}</summary>
    <ol class="mt-2 flex flex-col gap-2">
      <li v-for="change in changes" :key="change.id" class="flex flex-wrap items-baseline justify-between gap-x-3">
        <span class="font-medium text-fg-display tabular-nums">{{ describe(change) }}</span>
        <span class="body-three">{{ $t('configuration.history.line', { by: change.by, date: formatFullDate(change.at) }) }}</span>
      </li>
    </ol>
  </details>
</template>

<script setup lang="ts">
// imports
import { formatFullDate } from 'global/composables/date';
import type { IConfigurationChange } from 'configuration/types/configuration';

// props
defineProps<{ changes: IConfigurationChange[]; describe: (change: IConfigurationChange) => string }>();
</script>
