<template>
  <article class="flex min-w-0 flex-col gap-4" :aria-busy="question.status === 'pending' || undefined">
    <div class="group flex flex-col items-end gap-1 sm:flex-row-reverse sm:items-center sm:justify-start sm:gap-2">
      <p dir="auto" :class="{ 'bubble-pop': isFresh }" class="max-w-[88%] rounded-card bg-action px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-line text-fg-on-action shadow-action sm:max-w-[60%]">{{ question.text }}</p>
      <button type="button" class="feedback sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100" :class="{ invisible: store.isBusy }" :aria-label="$t('assistant.chat.editAria')" @click="handleEdit"><pencil-line-icon class="h-3.5 w-3.5" />{{ $t('assistant.chat.edit') }}</button>
    </div>

    <div class="flex min-w-0 flex-col gap-4" :class="{ 'turn-arrive': isFresh }">
      <div class="flex items-center gap-2.5">
        <span class="grid h-7 w-7 shrink-0 place-items-center rounded-control bg-selected text-fg-brand" :class="{ 'mark-breathe': question.status === 'pending' }"><olive-fill-icon class="h-4 w-4" /></span>
        <span class="text-sm font-semibold text-fg-display">{{ $t('assistant.chat.assistant') }}</span>
        <time v-if="question.answer?.computedAt" class="caption" :datetime="question.answer.computedAt">{{ formatDateTime(question.answer.computedAt) }}</time>
      </div>

      <div class="flex min-w-0 flex-col gap-4 sm:ps-9.5">
        <p v-if="question.status === 'pending' && !messageComputed" role="status" aria-live="polite" class="text-sm">
          <Transition name="stage" mode="out-in"><ui-shimmer-text :key="pendingLabelComputed" :text="pendingLabelComputed" /></Transition>
        </p>
        <p v-if="messageComputed" dir="auto" class="max-w-prose text-[15px] leading-relaxed whitespace-pre-line text-fg-default">
          <template v-if="streamComputed?.message"><span v-for="(word, index) in wordsComputed" :key="index" class="word">{{ word }}</span></template>
          <template v-else>{{ messageComputed }}</template>
          <span v-if="isTypingComputed" class="caret" aria-hidden="true" />
        </p>

        <div v-if="question.status === 'failed'" class="flex flex-col items-start gap-3 rounded-card bg-danger-subtle p-4" role="alert">
          <p class="text-sm text-fg-danger">{{ errorLabelComputed }}</p>
          <button type="button" class="btn-secondary press" :disabled="store.isBusy" @click="handleRetry">{{ $t('assistant.chat.retry') }}</button>
        </div>
        <div v-if="streamComputed?.isDisconnected" class="flex flex-wrap items-center gap-3 rounded-card bg-subtle p-3" role="status">
          <p class="flex-1 text-sm text-fg-default">{{ $t('assistant.chat.connectionLost') }}</p>
          <button type="button" class="btn-secondary press" :disabled="store.streamStatus.isLoading" @click="handleReconnect">{{ $t('assistant.chat.reconnect') }}</button>
        </div>

        <div v-if="choicesComputed.length" class="flex flex-col gap-2.5">
          <p class="body-two">{{ $t('assistant.chat.clarify') }}</p>
          <div class="flex flex-wrap gap-2">
            <button v-for="choice in choicesComputed" :key="choice.recordId" type="button" class="choice-chip press" :disabled="store.isBusy" @click="handleChoose(choice)">{{ choice.label }}</button>
          </div>
        </div>

        <TransitionGroup v-if="blocksComputed.length || waitingBlocksComputed.length" name="block-in" tag="div" class="grid min-w-0 gap-3" :class="{ 'sm:grid-cols-2 xl:grid-cols-4': isNumberGridComputed }">
          <div v-for="(block, index) in blocksComputed" :key="`block-${index}`" class="min-w-0" :class="{ 'col-span-full': block.type !== 'number', 'max-w-sm': block.type === 'number' && !isNumberGridComputed }" :style="{ '--block-index': index }">
            <assistant-block :block="block" />
          </div>
          <div v-for="(planned, index) in waitingBlocksComputed" :key="`planned-${blocksComputed.length + index}`" class="min-w-0" :class="{ 'col-span-full': planned.type !== 'number', 'max-w-sm': planned.type === 'number' && !isNumberGridComputed }" aria-hidden="true">
            <div class="skeleton rounded-card" :class="planned.type === 'number' ? 'h-28' : 'h-52'" />
          </div>
        </TransitionGroup>

        <Transition name="settle">
          <assistant-method v-if="question.status === 'answered' && question.answer?.method" class="max-w-3xl" :method="question.answer.method" />
        </Transition>

        <Transition name="settle">
          <footer v-if="question.status === 'answered' && !choicesComputed.length" class="-ms-2.5 flex flex-wrap items-center gap-1">
            <button v-if="messageComputed" type="button" class="feedback" :aria-label="$t('assistant.chat.copy')" @click="handleCopy">
              <Transition name="icon-swap" mode="out-in"><component :is="isCopied ? CheckLineIcon : DocumentLineIcon" :key="String(isCopied)" class="h-3.5 w-3.5" /></Transition>{{ isCopied ? $t('assistant.chat.copied') : $t('assistant.chat.copy') }}
            </button>
            <button type="button" class="feedback" :class="{ 'is-selected': question.rating === 1 }" :aria-pressed="question.rating === 1" :disabled="store.feedbackStatus.isLoading" @click="handleRate(1)">{{ $t('assistant.chat.helpful') }}</button>
            <button type="button" class="feedback" :class="{ 'is-selected': question.rating === -1 }" :aria-pressed="question.rating === -1" :disabled="store.feedbackStatus.isLoading" @click="handleRate(-1)">{{ $t('assistant.chat.notHelpful') }}</button>
            <p v-if="scopeLabelComputed && question.answer?.kind === 'answer'" class="ms-2 caption">{{ scopeLabelComputed }}</p>
          </footer>
        </Transition>

        <Transition name="settle">
          <section v-if="isLast && suggestionsComputed.length" class="flex flex-col gap-2" :aria-label="$t('assistant.chat.followUps')">
            <h3 class="caption">{{ $t('assistant.chat.followUps') }}</h3>
            <ul class="stagger flex flex-col items-start gap-1.5">
              <li v-for="suggestion in suggestionsComputed" :key="suggestion" class="max-w-full">
                <button type="button" dir="auto" class="follow-up press" :disabled="store.isBusy" @click="handleAsk(suggestion)">
                  <arrow-right-line-icon class="h-4 w-4 shrink-0 text-fg-brand rtl:-scale-x-100" /><span class="min-w-0 text-start">{{ suggestion }}</span>
                </button>
              </li>
            </ul>
          </section>
        </Transition>
    </div>
    </div>
  </article>
</template>

<script setup lang="ts">
// imports
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAssistantStore } from 'assistant/stores/assistant';
import { describeAnswerRange } from 'assistant/composables/answer-method';
import { formatDateTime } from 'global/composables/date';
import type { IAnswerBlock, IAnswerChoice, IAssistantQuestion, IPlannedBlock } from 'assistant/types/assistant';

import AssistantBlock from 'assistant/components/assistant-block.vue';
import AssistantMethod from 'assistant/components/assistant-method.vue';
import UiShimmerText from 'global/components/ui-shimmer-text.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';
import CheckLineIcon from 'global/icons/check-line.icon.vue';
import DocumentLineIcon from 'global/icons/document-line.icon.vue';
import OliveFillIcon from 'global/icons/olive-fill.icon.vue';
import PencilLineIcon from 'global/icons/pencil-line.icon.vue';

// props
const props = withDefaults(defineProps<{ question: IAssistantQuestion; isLast: boolean; isFresh?: boolean }>(), { isFresh: false });

// emits
const emit = defineEmits<{ (event: 'edit', text: string): void; (event: 'ask', text: string): void }>();

// stores
const store = useAssistantStore();
const { t, te } = useI18n();

// variables
const LONG_WAIT_MS = 15_000;
const COPIED_MS = 1800;
const now = ref(Date.now());
const isCopied = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

// computed
const streamComputed = computed(() => store.streamed[props.question.id]);
const messageComputed = computed((): string => streamComputed.value?.message || props.question.answer?.message || '');
const wordsComputed = computed((): string[] => streamComputed.value?.message.match(/\S+\s*/g) ?? []);
const isTypingComputed = computed((): boolean => streamComputed.value?.stage === 'receiving');
const blocksComputed = computed((): IAnswerBlock[] => (streamComputed.value ? streamComputed.value.blocks : (props.question.answer?.blocks ?? [])));
const waitingBlocksComputed = computed((): IPlannedBlock[] => (streamComputed.value ? streamComputed.value.plannedBlocks.slice(blocksComputed.value.length) : []));
const isNumberGridComputed = computed((): boolean => [...blocksComputed.value, ...waitingBlocksComputed.value].filter((block) => block.type === 'number').length > 1);
const choicesComputed = computed((): IAnswerChoice[] => (streamComputed.value?.choices.length ? streamComputed.value.choices : (props.question.answer?.choices ?? [])));
const suggestionsComputed = computed((): string[] => (props.question.status === 'answered' ? (props.question.answer?.suggestions ?? []) : []));
const errorLabelComputed = computed((): string => (props.question.errorCode && te(`assistant.errors.${props.question.errorCode}`) ? t(`assistant.errors.${props.question.errorCode}`) : t('assistant.errors.default')));
/** Sites, then the dates the answer really covers (from its method), never the Home period the question may have overridden. */
const scopeLabelComputed = computed((): string => {
  const scope = props.question.answer?.scope;
  if (!scope) return '';
  const method = props.question.answer?.method;
  const range = method ? describeAnswerRange(method) : null;
  return [scope.siteNames.join(', '), range].filter(Boolean).join(' · ');
});
const pendingLabelComputed = computed((): string => {
  const stream = streamComputed.value;
  if (stream?.isDisconnected) return t('assistant.chat.stages.disconnected');
  if (stream && now.value - stream.startedAt > LONG_WAIT_MS && stream.stage !== 'reconnecting') return t('assistant.chat.longWait');
  if (stream?.stage === 'searching' && stream.entities.length) return t('assistant.chat.stages.reading', { what: stream.entities.map((entity) => t(`assistant.entities.${entity}`)).join(', ') });
  return t(`assistant.chat.stages.${stream?.stage ?? 'queued'}`);
});

// watchers
watch(
  () => props.question.status,
  (status) => {
    clearInterval(timer);
    if (status === 'pending') timer = setInterval(() => (now.value = Date.now()), 1000);
  },
  { immediate: true },
);

// event handlers
const handleRetry = (): void => {
  void store.retry(props.question);
};
const handleReconnect = (): void => {
  void store.listen(props.question);
};
const handleChoose = (choice: IAnswerChoice): void => {
  void store.choose(props.question, choice);
};
const handleRate = (rating: number): void => {
  void store.rate(props.question, rating);
};
const handleEdit = (): void => {
  emit('edit', props.question.text);
};
const handleAsk = (text: string): void => {
  emit('ask', text);
};
const handleCopy = async (): Promise<void> => {
  await navigator.clipboard?.writeText(messageComputed.value).catch(() => undefined);
  isCopied.value = true;
  setTimeout(() => (isCopied.value = false), COPIED_MS);
};

// lifecycle
onBeforeUnmount(() => clearInterval(timer));
</script>

<style scoped>
@reference "~/style.css";

/* A question just sent grows out of its own corner, the way a sent message settles in iMessage. */
.bubble-pop {
  transform-origin: right bottom;
  animation: bubble-pop 0.6s var(--ease-glide) backwards;
}

.bubble-pop:dir(rtl) {
  transform-origin: left bottom;
}

/* The answer under a question just sent arrives as the question settles. */
.turn-arrive {
  animation: turn-arrive 0.6s var(--ease-premium) 0.22s backwards;
}

/* Each streamed word comes into focus, so the text develops rather than ticks. */
.word {
  animation: word-in 0.55s var(--ease-premium) backwards;
}

.feedback {
  @apply inline-flex min-h-9 items-center gap-1.5 rounded-control px-2.5 text-xs text-fg-secondary-paragraph transition-[color,background-color,transform] duration-200 ease-(--ease-premium) hover:bg-subtle hover:text-fg-display active:scale-95;
}

.feedback:disabled {
  @apply pointer-events-none opacity-40;
}

.follow-up {
  @apply flex min-h-10 max-w-full items-center gap-2 rounded-control border border-default bg-surface px-3 py-2 text-sm text-fg-default transition-[border-color,background-color,color] duration-200 ease-(--ease-premium) hover:border-brand hover:bg-selected/40 hover:text-fg-brand disabled:pointer-events-none disabled:opacity-50;
}

.feedback.is-selected {
  @apply bg-selected text-fg-brand;
}

.caret {
  @apply ms-0.5 inline-block h-[1.05em] w-0.5 translate-y-0.5 rounded-full bg-action;
  animation: caret-blink 1s steps(2, start) infinite;
}

.mark-breathe {
  animation: mark-breathe 1.8s ease-in-out infinite;
}

.block-in-enter-active {
  transition:
    opacity 0.5s var(--ease-premium),
    transform 0.7s var(--ease-glide),
    filter 0.5s var(--ease-premium);
  transition-delay: calc(var(--block-index, 0) * 70ms);
}

.block-in-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.97);
  filter: blur(6px);
}

.stage-enter-active,
.stage-leave-active {
  transition:
    opacity 0.28s var(--ease-premium),
    transform 0.36s var(--ease-premium),
    filter 0.28s var(--ease-premium);
}

.stage-enter-from {
  opacity: 0;
  transform: translateY(6px);
  filter: blur(3px);
}

.stage-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  filter: blur(3px);
}

.settle-enter-active {
  transition:
    opacity 0.5s var(--ease-premium) 0.12s,
    transform 0.6s var(--ease-premium) 0.12s;
}

.settle-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.icon-swap-enter-active,
.icon-swap-leave-active {
  transition:
    opacity 0.16s var(--ease-premium),
    transform 0.22s var(--ease-premium),
    filter 0.16s var(--ease-premium);
}

.icon-swap-enter-from,
.icon-swap-leave-to {
  opacity: 0;
  transform: scale(0.6);
  filter: blur(2px);
}

.block-in-leave-active {
  display: none;
}

@keyframes bubble-pop {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.9);
    filter: blur(4px);
  }
}

@keyframes turn-arrive {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

@keyframes word-in {
  from {
    opacity: 0;
    filter: blur(5px);
  }
}

/* Blurring every word is more than a phone's compositor should carry. */
@media (max-width: 47.99rem) {
  .word {
    animation-name: word-in-plain;
  }

  .block-in-enter-from {
    filter: none;
  }

  .bubble-pop {
    animation-name: bubble-pop-plain;
  }
}

@keyframes bubble-pop-plain {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.9);
  }
}

@keyframes word-in-plain {
  from {
    opacity: 0;
  }
}

@keyframes caret-blink {
  to {
    visibility: hidden;
  }
}

@keyframes mark-breathe {
  50% {
    transform: scale(0.88);
    opacity: 0.7;
  }
}

@media (prefers-reduced-motion: reduce) {
  .turn-arrive,
  .bubble-pop,
  .caret,
  .mark-breathe {
    animation: none;
  }

  .word {
    animation-name: word-in-plain;
    animation-duration: 0.2s;
  }

  .block-in-enter-active,
  .stage-enter-active,
  .stage-leave-active,
  .settle-enter-active,
  .icon-swap-enter-active,
  .icon-swap-leave-active,
  .feedback,
  .follow-up {
    transition: opacity 0.2s linear;
  }

  .block-in-enter-from,
  .stage-enter-from,
  .stage-leave-to,
  .settle-enter-from,
  .icon-swap-enter-from,
  .icon-swap-leave-to {
    transform: none;
    filter: none;
  }
}
</style>
