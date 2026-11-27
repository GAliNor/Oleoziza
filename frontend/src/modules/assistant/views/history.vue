<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 pb-10">
      <header class="rise flex flex-wrap items-end justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <h1 class="heading-one">
            {{ $t('assistant.history.title') }}<span v-if="store.hasHistoryLoaded" class="ms-3 align-middle text-lg font-medium text-fg-muted tabular-nums">{{ store.conversationTotal }}</span>
          </h1>
          <p class="body-two">{{ $t('assistant.history.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-2">
          <ui-confirm-button v-if="store.conversations.length" :label="$t('assistant.history.clear')" :confirm-label="$t('assistant.history.clearConfirm')" is-quiet :is-disabled="store.mutationStatus.isLoading" @confirm="handleClear" />
          <button type="button" class="btn-primary press" @click="handleNew"><add-line-icon class="h-4 w-4" />{{ $t('assistant.chat.newConversation') }}</button>
        </div>
      </header>
      <assistant-history @open="handleOpen" @new="handleNew" />
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { useRouter } from 'vue-router';

import { useAssistantStore } from 'assistant/stores/assistant';
import { CONVERSATION_QUERY, NEW_CONVERSATION } from 'assistant/constants/routes';
import { HOME_ROUTE_NAME } from 'global/constants/navigation';

import AssistantHistory from 'assistant/components/assistant-history.vue';
import AppLayout from 'global/components/app-layout.vue';
import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';

// stores
const store = useAssistantStore();
const router = useRouter();

// event handlers
const handleOpen = (id: string): void => {
  void router.push({ name: HOME_ROUTE_NAME, query: { [CONVERSATION_QUERY]: id } });
};
const handleNew = (): void => {
  void router.push({ name: HOME_ROUTE_NAME, query: { [CONVERSATION_QUERY]: NEW_CONVERSATION } });
};
const handleClear = (): void => {
  void store.removeConversation(null);
};
</script>
