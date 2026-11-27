<template>
  <div class="flex w-full min-w-0 flex-col">
    <Transition name="conversation">
      <div v-if="isActive" class="flex w-full min-w-0 flex-col gap-8 pb-56">
        <header class="flex min-w-0 items-center gap-3 border-b border-default pb-3">
          <button type="button" class="btn-plain press shrink-0 px-3" @click="handleClose"><arrow-left-line-icon class="h-4 w-4 rtl:-scale-x-100" />{{ $t('assistant.chat.back') }}</button>
          <h2 v-if="titleComputed" dir="auto" class="min-w-0 flex-1 truncate border-s border-default ps-3 text-sm font-medium text-fg-default" :title="titleComputed">{{ titleComputed }}</h2>
        </header>

        <div v-if="store.openStatus.isLoading" class="flex flex-col gap-4" role="status">
          <span class="sr-only">{{ $t('assistant.chat.opening') }}</span>
          <div class="skeleton ms-auto h-12 w-1/2 rounded-card" />
          <div class="skeleton h-24 rounded-card" />
        </div>
        <ui-empty-state v-else-if="store.openStatus.hasError" class="card" tone="danger" size="compact" :message="$t('assistant.chat.openError')" />
        <div v-else-if="!store.questions.length" class="welcome flex flex-col items-start gap-3 py-6 sm:py-10">
          <span class="grid h-12 w-12 place-items-center rounded-card bg-selected text-fg-brand"><olive-fill-icon class="h-6 w-6" /></span>
          <h2 class="heading-two">{{ $t('assistant.chat.welcome', { name: sessionStore.salutation }) }}</h2>
          <p class="max-w-lg body-one text-fg-secondary-paragraph">{{ $t('assistant.chat.welcomeDetail') }}</p>
          <div class="stagger mt-3 flex flex-wrap gap-2">
            <button v-for="suggestion in suggestionsComputed" :key="suggestion" type="button" class="choice-chip press text-start" @click="handleSuggestion(suggestion)">{{ suggestion }}</button>
          </div>
        </div>
        <template v-else>
          <assistant-message v-for="(question, index) in store.questions" :key="question.id" :question="question" :is-last="index === store.questions.length - 1" :is-fresh="freshIds.has(question.id)" @edit="handleEdit" @ask="handleAsk" />
        </template>
        <p v-if="store.feedbackStatus.hasError" role="alert" class="text-sm text-fg-danger">{{ $t('assistant.chat.feedbackError') }}</p>
        <div ref="endRef" class="scroll-mb-56" />
      </div>
    </Transition>

    <Transition name="latest">
      <div v-if="hasUnread && isActive" class="pointer-events-none fixed inset-x-4 z-30 flex justify-center md:start-64" :style="{ bottom: `calc(max(var(--bottom-nav, 0px), ${keyboardInset}px) + 9rem)` }">
        <button type="button" class="btn-secondary press pointer-events-auto shadow-lifted" @click="handleLatest"><chevron-down-line-icon class="h-4 w-4" />{{ $t('assistant.chat.latestAnswer') }}</button>
      </div>
    </Transition>

    <assistant-composer
      ref="composerRef"
      v-model="draft"
      :is-busy="store.isBusy"
      :is-sending="store.submitStatus.isLoading"
      :has-error="store.submitStatus.hasError"
      :is-online="isOnline"
      :keyboard-inset="keyboardInset"
      :can-start-new="isActive && store.questions.length > 0"
      @submit="handleSubmit"
      @history="handleHistory"
      @new="handleNew"
      @edit-last="handleEditLast"
    />
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAssistantStore } from 'assistant/stores/assistant';
import { useChatScroll } from 'assistant/composables/use-chat-scroll';
import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { createId } from 'global/composables/crypto';
import { useKeyboardInset } from 'global/composables/use-keyboard-inset';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { usePeriod } from 'global/composables/use-period';
import { CONVERSATION_QUERY, NEW_CONVERSATION } from 'assistant/constants/routes';
import { ALL_SITES } from 'site/constants/site';

import AssistantComposer from 'assistant/components/assistant-composer.vue';
import AssistantMessage from 'assistant/components/assistant-message.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import ChevronDownLineIcon from 'global/icons/chevron-down-line.icon.vue';
import OliveFillIcon from 'global/icons/olive-fill.icon.vue';

// props
const props = defineProps<{ isActive: boolean }>();

// emits
const emit = defineEmits<{ (event: 'update:isActive', value: boolean): void }>();

// stores
const store = useAssistantStore();
const sessionStore = useSessionStore();
const siteStore = useSiteStore();
const { t } = useI18n();
const { period } = usePeriod();
const route = useRoute();
const router = useRouter();

// variables
const SUGGESTION_KEYS = ['revenue', 'debts', 'waiting', 'storage'];
const draft = ref('');
const draftRequestId = ref(createId());
/** Questions asked on this screen: only they get the arrival motion, not a reopened Conversation. */
const freshIds = ref(new Set<string>());
const endRef = ref<HTMLElement | null>(null);
const composerRef = ref<InstanceType<typeof AssistantComposer> | null>(null);
const keyboardInset = useKeyboardInset();
const { isOnline } = useOnlineStatus();
const { hasUnread, scrollToLatest, followAnswer } = useChatScroll(endRef);

// computed
const suggestionsComputed = computed((): string[] => SUGGESTION_KEYS.map((key) => t(`assistant.chat.suggestions.${key}`)));
const titleComputed = computed((): string => store.questions[0]?.text ?? '');
const answerRevisionComputed = computed((): string => store.questions.map((question) => `${question.id}:${question.status}:${store.streamed[question.id]?.message.length ?? 0}:${store.streamed[question.id]?.blocks.length ?? 0}`).join('|'));

// watchers
watch(answerRevisionComputed, () => {
  if (props.isActive) followAnswer();
});
watch(draft, () => (draftRequestId.value = createId()), { flush: 'sync' });

// methods
/** Keeps the open Conversation in the Home's URL, so a reload or a shared link reopens it. */
const writeConversationQuery = (id: string | null): void => {
  if ((route.query[CONVERSATION_QUERY] ?? null) === id) return;
  void router.replace({ query: { ...route.query, [CONVERSATION_QUERY]: id ?? undefined } });
};

/** The history page sends `?conversation=<id>` or `?conversation=new`; anything else is ignored. */
const followConversationQuery = (value: unknown): void => {
  if (typeof value !== 'string' || value === store.conversationId) return;
  if (value === NEW_CONVERSATION) void handleNew();
  else void handleOpen(value);
};

// event handlers
/** The question shows at once in its place; a refused send puts the text back with the same request id. */
const handleSubmit = async (): Promise<void> => {
  const text = draft.value.trim();
  const requestId = draftRequestId.value;
  if (!text || store.isBusy) return;
  emit('update:isActive', true);
  const siteId = siteStore.currentSiteId && siteStore.currentSiteId !== ALL_SITES ? siteStore.currentSiteId : null;
  freshIds.value = new Set([...freshIds.value, requestId]);
  draft.value = '';
  const isSent = store.submit({ text, requestId, siteId, period: period.value.key });
  scrollToLatest(true);
  if (await isSent) return;
  if (!draft.value) {
    draft.value = text;
    draftRequestId.value = requestId;
  }
};
const handleClose = (): void => {
  emit('update:isActive', false);
  writeConversationQuery(null);
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
};
const handleNew = async (): Promise<void> => {
  store.newConversation();
  freshIds.value = new Set();
  draft.value = '';
  emit('update:isActive', true);
  writeConversationQuery(null);
  await nextTick();
  composerRef.value?.focus();
};
const handleHistory = (): void => {
  void router.push({ name: 'assistant-history' });
};
const handleOpen = async (id: string): Promise<void> => {
  freshIds.value = new Set();
  emit('update:isActive', true);
  if (await store.openConversation(id)) {
    scrollToLatest();
    composerRef.value?.focus();
  }
};
const handleSuggestion = (text: string): void => {
  draft.value = text;
  composerRef.value?.focus();
};
const handleEdit = async (text: string): Promise<void> => {
  draft.value = text;
  await nextTick();
  composerRef.value?.focus();
};
const handleEditLast = (): void => {
  const last = store.questions.at(-1);
  if (last && !store.isBusy) void handleEdit(last.text);
};
const handleAsk = (text: string): void => {
  draft.value = text;
  void handleSubmit();
};
const handleLatest = (): void => {
  scrollToLatest(true);
};

watch(() => route.query[CONVERSATION_QUERY], followConversationQuery, { immediate: true });
watch(
  () => store.conversationId,
  (id) => {
    if (props.isActive && id) writeConversationQuery(id);
  },
);

// lifecycle
onBeforeUnmount(() => store.clear());
</script>

<style scoped>
.conversation-enter-active {
  transition:
    opacity 0.45s var(--ease-premium),
    transform 0.65s var(--ease-glide),
    filter 0.45s var(--ease-premium);
}

.conversation-leave-active {
  transition:
    opacity 0.3s var(--ease-premium),
    transform 0.4s var(--ease-premium),
    filter 0.3s var(--ease-premium);
}

.conversation-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.985);
  filter: blur(6px);
}

.conversation-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.99);
  filter: blur(6px);
}

@media (max-width: 47.99rem) {
  .conversation-enter-from,
  .conversation-leave-to {
    filter: none;
  }
}

.latest-enter-active,
.latest-leave-active {
  transition:
    opacity 0.25s var(--ease-premium),
    transform 0.4s var(--ease-glide);
}

.latest-enter-from,
.latest-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}

@media (prefers-reduced-motion: reduce) {
  .conversation-enter-active,
  .conversation-leave-active,
  .latest-enter-active,
  .latest-leave-active {
    transition: none;
  }
}
</style>
