<template>
  <form
    class="assistant-dock fixed inset-x-0 z-30 border-t border-default bg-surface/90 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:start-64 md:px-8"
    :style="{ bottom: `max(var(--bottom-nav, 0px), ${keyboardInset}px)` }"
    @submit.prevent="handleSubmit"
  >
    <div class="relative mx-auto max-w-6xl">
      <div class="mb-1.5 flex min-h-8 items-center justify-between gap-3 px-1 text-xs">
        <p role="status" aria-live="polite" class="min-w-0 truncate" :class="[hasMicDenied || !isOnline ? 'text-fg-warning' : 'text-fg-secondary-paragraph', { 'max-sm:invisible': isIdleHintComputed }]">{{ statusLabelComputed }}</p>
        <div class="flex shrink-0 items-center gap-1.5">
          <button v-if="canStartNew" type="button" class="history-button press" :aria-label="$t('assistant.chat.newConversation')" @click="handleNew"><add-line-icon class="h-4 w-4 shrink-0" /><span class="hidden sm:inline">{{ $t('assistant.chat.newConversation') }}</span></button>
          <button type="button" class="history-button press" @click="handleHistory">
            <history-line-icon class="h-4 w-4 shrink-0" />
            <span>{{ $t('assistant.history.title') }}</span>
          </button>
        </div>
      </div>

      <div class="composer flex items-end gap-1.5 rounded-card border border-default bg-surface p-1.5 ps-3" :class="{ 'is-offline': !isOnline }">
        <sparkle-line-icon v-if="!isVoiceActive" class="my-3 h-5 w-5 shrink-0 text-fg-brand" />
        <label v-show="!isVoiceActive" class="min-w-0 flex-1">
          <span class="sr-only">{{ $t('assistant.dock.label') }}</span>
          <textarea
            ref="inputRef"
            dir="auto"
            :value="modelValue"
            class="block max-h-36 min-h-11 w-full resize-none bg-transparent py-2.5 text-base leading-6 text-fg-default outline-none placeholder:truncate placeholder:text-fg-muted"
            rows="1"
            maxlength="1000"
            :placeholder="$t('assistant.dock.placeholder')"
            :disabled="isSending || !isOnline"
            @input="handleInput"
            @keydown="handleKeydown"
          />
        </label>
        <assistant-recorder :is-disabled="isBusy || !isOnline" @transcript="handleTranscript" @active="handleVoiceActive" @denied="handleMicDenied" />
        <button v-show="!isVoiceActive" type="submit" class="send-button press grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-control bg-action text-fg-on-action shadow-action disabled:bg-emphasis disabled:text-fg-muted disabled:shadow-none" :class="{ 'is-launching': isLaunching }" :disabled="!canSendComputed" :aria-label="$t('assistant.dock.send')">
          <arrow-up-line-icon class="send-arrow h-5 w-5" />
        </button>
      </div>
      <p v-if="hasError" class="mt-1.5 px-1 text-sm text-fg-danger" role="alert">{{ $t('assistant.chat.submitError') }}</p>
    </div>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AssistantRecorder from 'assistant/components/assistant-recorder.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import ArrowUpLineIcon from 'global/icons/arrow-up-line.icon.vue';
import HistoryLineIcon from 'global/icons/history-line.icon.vue';
import SparkleLineIcon from 'global/icons/sparkle-line.icon.vue';

// props
const props = defineProps<{ modelValue: string; isBusy: boolean; isSending: boolean; hasError: boolean; isOnline: boolean; keyboardInset: number; canStartNew: boolean }>();

// emits
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void; (event: 'submit'): void; (event: 'history'): void; (event: 'new'): void; (event: 'editLast'): void }>();

// stores
const { t } = useI18n();

// variables
const MAXIMUM_INPUT_HEIGHT = 144;
const inputRef = ref<HTMLTextAreaElement | null>(null);
const isVoiceActive = ref(false);
const hasMicDenied = ref(false);
const isLaunching = ref(false);
const LAUNCH_MS = 520;

// computed
const canSendComputed = computed((): boolean => props.isOnline && !props.isBusy && Boolean(props.modelValue.trim()));
/** The keyboard hint means nothing on a phone, so only real states show there. */
const isIdleHintComputed = computed((): boolean => props.isOnline && !hasMicDenied.value && !props.isSending && !props.isBusy);
const statusLabelComputed = computed((): string => {
  if (!props.isOnline) return t('assistant.dock.offline');
  if (hasMicDenied.value) return t('assistant.voice.denied');
  if (props.isSending) return t('assistant.dock.sending');
  return t(props.isBusy ? 'assistant.dock.answering' : 'assistant.dock.hint');
});

// methods
const resize = (): void => {
  if (!inputRef.value) return;
  inputRef.value.style.height = 'auto';
  inputRef.value.style.height = `${Math.min(inputRef.value.scrollHeight, MAXIMUM_INPUT_HEIGHT)}px`;
};
const focus = (): void => {
  inputRef.value?.focus();
};

// event handlers
const handleInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
};
const handleSubmit = (): void => {
  if (!canSendComputed.value) return;
  isLaunching.value = true;
  setTimeout(() => (isLaunching.value = false), LAUNCH_MS);
  emit('submit');
};
const handleHistory = (): void => {
  emit('history');
};
const handleNew = (): void => {
  emit('new');
};
const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowUp' && !props.modelValue && !event.isComposing) {
    event.preventDefault();
    emit('editLast');
    return;
  }
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  handleSubmit();
};
const handleTranscript = async (text: string, shouldSend: boolean): Promise<void> => {
  const draft = props.modelValue.trim();
  emit('update:modelValue', draft ? `${draft} ${text}` : text);
  await nextTick();
  if (shouldSend) handleSubmit();
  else focus();
};
const handleVoiceActive = (isActive: boolean): void => {
  isVoiceActive.value = isActive;
};
const handleMicDenied = (hasDenied: boolean): void => {
  hasMicDenied.value = hasDenied;
};

// watchers
watch(() => props.modelValue, () => void nextTick(resize));

defineExpose({ focus });
</script>

<style scoped>
@reference "~/style.css";

.composer {
  transition:
    border-color 0.25s var(--ease-premium),
    box-shadow 0.35s var(--ease-premium);
}

.composer:focus-within {
  @apply border-brand shadow-raised;
}

.composer.is-offline {
  @apply opacity-70;
}

.send-button {
  transition:
    background-color 0.2s var(--ease-premium),
    transform 0.35s var(--ease-spring);
}

.send-button:not(:disabled):hover {
  @apply bg-action-hover;
  transform: scale(1.04);
}

.send-button.is-launching .send-arrow {
  animation: send-launch 0.52s var(--ease-premium);
}

@keyframes send-launch {
  40% {
    transform: translateY(-140%);
    opacity: 0;
  }

  41% {
    transform: translateY(120%);
    opacity: 0;
  }
}

.history-button {
  @apply inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-control border border-default bg-surface px-3 font-medium text-fg-default transition-colors duration-200 ease-(--ease-premium);
}

.history-button:hover {
  @apply border-brand bg-selected/40 text-fg-brand;
}

@media (prefers-reduced-motion: reduce) {
  .composer,
  .send-button {
    transition: none;
  }

  .send-button:not(:disabled):hover {
    transform: none;
  }

  .send-button.is-launching .send-arrow {
    animation: none;
  }
}
</style>
