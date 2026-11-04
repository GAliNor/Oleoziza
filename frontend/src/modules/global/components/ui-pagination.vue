<template>
  <nav v-if="pageCount > 1" class="flex items-center justify-between gap-3" :aria-label="$t('global.pagination.label')">
    <p class="body-two tabular-nums">{{ $t('global.pagination.range', { first, last, total }) }}</p>
    <div class="flex items-center gap-1">
      <button type="button" class="icon-btn" :disabled="page === 1" :aria-label="$t('global.pagination.previous')" @click="page -= 1">
        <arrow-left-line-icon class="h-4 w-4" />
      </button>
      <button
        v-for="number in pageCount"
        :key="number"
        type="button"
        class="h-9 min-w-9 rounded-lg px-2 text-sm tabular-nums transition-colors"
        :class="number === page ? 'bg-action text-fg-on-action' : 'text-fg-primary-paragraph hover:bg-subtle'"
        :aria-current="number === page ? 'page' : undefined"
        @click="page = number"
      >
        {{ number }}
      </button>
      <button type="button" class="icon-btn" :disabled="page === pageCount" :aria-label="$t('global.pagination.next')" @click="page += 1">
        <arrow-right-line-icon class="h-4 w-4" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// props
const props = defineProps<{ pageCount: number; total: number; pageSize: number }>();

// variables
const page = defineModel<number>('page', { required: true });

// computed
const first = computed((): number => (page.value - 1) * props.pageSize + 1);
const last = computed((): number => Math.min(page.value * props.pageSize, props.total));
</script>
