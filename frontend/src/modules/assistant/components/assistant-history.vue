<template>
  <section class="flex flex-col gap-6" :aria-busy="store.historyStatus.isLoading || undefined" :aria-label="$t('assistant.history.title')">
    <div v-if="contentStateComputed === 'loading'" class="card flex flex-col gap-2 p-3" role="status">
      <span class="sr-only">{{ $t('assistant.history.loading') }}</span>
      <div v-for="index in PAGE_SIZE" :key="index" class="skeleton h-16 rounded-control" />
    </div>
    <ui-empty-state v-else-if="contentStateComputed === 'error'" class="card" tone="danger" size="compact" :message="$t('assistant.history.error')">
      <template #action>
        <button type="button" class="btn-secondary" @click="handleRetry">{{ $t('assistant.chat.retry') }}</button>
      </template>
    </ui-empty-state>
    <ui-empty-state v-else-if="contentStateComputed === 'empty'" class="card" size="compact" :message="$t('assistant.history.empty')">
      <template #action>
        <button type="button" class="btn-primary press" @click="handleNew"><add-line-icon class="h-4 w-4" />{{ $t('assistant.chat.newConversation') }}</button>
      </template>
    </ui-empty-state>
    <template v-else>
      <section v-for="group in groupsComputed" :key="group.key" class="rise flex flex-col gap-2">
        <h2 class="px-1 eyebrow">{{ $t(`assistant.history.groups.${group.key}`) }}</h2>
        <ul class="card flex flex-col divide-y divide-subtle p-0">
          <li v-for="conversation in group.items" :key="conversation.id" class="group flex items-center gap-2 pe-2 transition-colors duration-200 hover:bg-subtle">
            <button type="button" class="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-start" @click="handleOpen(conversation.id)">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-selected text-fg-brand"><sparkle-line-icon class="h-4 w-4" /></span>
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span dir="auto" class="line-clamp-2 text-[15px] font-medium text-fg-default">{{ conversation.title }}</span>
                <time class="caption" :datetime="conversation.updatedAt">{{ formatDateTime(conversation.updatedAt) }}</time>
              </span>
              <chevron-right-line-icon class="h-4 w-4 shrink-0 text-fg-muted transition-transform duration-300 ease-(--ease-premium) group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden="true" />
            </button>
            <ui-confirm-button class="shrink-0 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100" :label="$t('assistant.history.delete')" :confirm-label="$t('assistant.history.deleteConfirm')" is-quiet :is-disabled="store.mutationStatus.isLoading" @confirm="handleRemove(conversation.id)" />
          </li>
        </ul>
      </section>
      <ui-load-more :shown="store.conversations.length" :total="store.conversationTotal" :is-loading="store.historyStatus.isLoading" :page-size="PAGE_SIZE" @more="handleMore" />
    </template>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted } from 'vue';

import { useAssistantStore } from 'assistant/stores/assistant';
import { formatDateTime, todayIso, shiftDate, toIsoDate } from 'global/composables/date';
import { PAGE_SIZE } from 'global/constants/page';
import type { IConversationListItem } from 'assistant/types/assistant';

import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiLoadMore from 'global/components/ui-load-more.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import ChevronRightLineIcon from 'global/icons/chevron-right-line.icon.vue';
import SparkleLineIcon from 'global/icons/sparkle-line.icon.vue';

// emits
const emit = defineEmits<{ (event: 'open', id: string): void; (event: 'new'): void }>();

// stores
const store = useAssistantStore();

// variables
type HistoryGroup = 'today' | 'yesterday' | 'week' | 'earlier';
const GROUP_ORDER: HistoryGroup[] = ['today', 'yesterday', 'week', 'earlier'];
const WEEK_DAYS = 7;

// computed
const contentStateComputed = computed((): string => {
  if (store.historyStatus.isLoading && !store.hasHistoryLoaded) return 'loading';
  if (store.historyStatus.hasError && !store.conversations.length) return 'error';
  return store.conversations.length ? 'list' : 'empty';
});
const groupsComputed = computed((): { key: HistoryGroup; items: IConversationListItem[] }[] => {
  const today = todayIso();
  const yesterday = shiftDate(today, -1);
  const weekStart = shiftDate(today, -WEEK_DAYS);
  const groupOf = (updatedAt: string): HistoryGroup => {
    const day = toIsoDate(updatedAt);
    if (day === today) return 'today';
    if (day === yesterday) return 'yesterday';
    return day > weekStart ? 'week' : 'earlier';
  };
  return GROUP_ORDER.map((key) => ({ key, items: store.conversations.filter((item) => groupOf(item.updatedAt) === key) })).filter((group) => group.items.length);
});

// event handlers
const handleOpen = (id: string): void => {
  emit('open', id);
};
const handleNew = (): void => {
  emit('new');
};
const handleRemove = (id: string): void => {
  void store.removeConversation(id);
};
const handleMore = (): void => {
  void store.loadHistory(true);
};
const handleRetry = (): void => {
  void store.loadHistory();
};

// lifecycle
onMounted(() => void store.loadHistory());
</script>
