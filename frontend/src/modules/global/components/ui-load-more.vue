<template>
  <div v-if="total > pageSize" class="flex flex-col items-center gap-2 py-2" aria-live="polite">
    <button v-if="isMore" type="button" class="btn-secondary min-w-44" :disabled="isLoading" :aria-busy="isLoading" @click="emit('more')">
      <span v-if="isLoading" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-e-transparent" aria-hidden="true" />
      {{ $t('global.loadMore.more', { count: Math.min(pageSize, total - shown) }) }}
    </button>
    <p class="caption tabular-nums">{{ isMore ? $t('global.loadMore.range', { shown, total }) : $t('global.loadMore.all', { total }, total) }}</p>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { hasMore } from 'global/composables/page';
import { PAGE_SIZE } from 'global/constants/page';

// props
const props = withDefaults(defineProps<{ shown: number; total: number; isLoading?: boolean; pageSize?: number }>(), { isLoading: false, pageSize: PAGE_SIZE });

// emits
const emit = defineEmits<{ (event: 'more'): void }>();

// computed
const isMore = computed((): boolean => hasMore(props.shown, props.total));
</script>
