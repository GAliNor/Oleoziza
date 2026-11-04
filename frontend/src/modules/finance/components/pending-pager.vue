<template>
  <nav class="flex items-center justify-between gap-3 rounded-full bg-subtle py-1.5 pr-1.5 pl-4 shadow-hairline" :aria-label="$t('finance.pager.label')">
    <p class="flex items-center gap-2 text-sm whitespace-nowrap">
      <span class="h-2 w-2 rounded-full bg-warning-amber" aria-hidden="true" />
      <span class="font-medium text-fg-display">{{ $t('finance.pager.label') }}</span>
      <span class="text-fg-secondary-paragraph tabular-nums">{{ steps.position ? $t('finance.pager.position', { position: steps.position, total: steps.total }) : steps.total }}</span>
    </p>
    <div v-if="steps.nextId" class="flex items-center gap-1.5">
      <button v-if="steps.previousId" type="button" class="btn-round" :aria-label="$t('finance.pager.previous')" @click="emit('open', steps.previousId!)">
        <arrow-left-line-icon class="h-4 w-4" />
      </button>
      <button type="button" class="btn-primary min-h-9 px-4 shadow-none" @click="emit('open', steps.nextId!)">
        {{ $t('finance.pager.next') }}
        <arrow-right-line-icon class="h-4 w-4" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
// imports
import type { IPendingSteps } from 'finance/types/finance';

import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// props
defineProps<{ steps: IPendingSteps }>();

// emits
const emit = defineEmits<{ (event: 'open', id: string): void }>();
</script>
