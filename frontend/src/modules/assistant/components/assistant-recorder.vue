<template>
  <div v-if="isRecording || store.transcribeStatus.isLoading" class="recorder flex min-h-11 flex-1 items-center gap-3 ps-1" role="status" aria-live="polite">
    <template v-if="isRecording">
      <span class="rec-dot h-2 w-2 shrink-0 rounded-full bg-danger" aria-hidden="true" />
      <ui-waveform class="min-w-0 flex-1 overflow-hidden text-fg-brand" :levels="levels" :label="$t('assistant.voice.recording')" />
      <span class="shrink-0 text-sm text-fg-secondary-paragraph tabular-nums">{{ timerComputed }}</span>
      <button type="button" class="icon-btn shrink-0" :aria-label="$t('assistant.voice.cancel')" @click="handleCancel"><close-line-icon class="h-4 w-4" /></button>
      <button type="button" class="press grid h-10 shrink-0 place-items-center rounded-control border border-default px-3 text-sm font-medium text-fg-default transition-colors duration-200 hover:border-brand hover:text-fg-brand" :title="$t('assistant.voice.reviewHint')" @click="handleStop(false)"><span class="flex items-center gap-1.5"><check-line-icon class="h-4 w-4" />{{ $t('assistant.voice.review') }}</span></button>
      <button type="button" class="press grid h-10 w-10 shrink-0 place-items-center rounded-control bg-action text-fg-on-action shadow-action hover:bg-action-hover" :aria-label="$t('assistant.voice.send')" :title="$t('assistant.voice.send')" @click="handleStop(true)"><arrow-up-line-icon class="h-5 w-5" /></button>
    </template>
    <p v-else class="flex-1 text-sm"><ui-shimmer-text :text="$t('assistant.voice.transcribing')" /></p>
  </div>
  <button
    v-else
    type="button"
    class="mic-button press grid h-10 w-10 shrink-0 place-items-center rounded-control text-fg-secondary-paragraph transition-colors duration-200 hover:bg-subtle hover:text-fg-display disabled:opacity-40"
    :disabled="isDisabled || !isSupported"
    :aria-label="$t('assistant.voice.start')"
    :title="isSupported ? $t('assistant.voice.start') : $t('assistant.voice.unsupported')"
    @click="handleStart"
  >
    <mic-line-icon class="h-5 w-5" />
  </button>
</template>

<script setup lang="ts">
// imports
import { computed, watch } from 'vue';

import { useAssistantStore } from 'assistant/stores/assistant';
import { useVoiceRecorder } from 'global/composables/use-voice-recorder';

import UiShimmerText from 'global/components/ui-shimmer-text.vue';
import UiWaveform from 'global/components/ui-waveform.vue';
import ArrowUpLineIcon from 'global/icons/arrow-up-line.icon.vue';
import CheckLineIcon from 'global/icons/check-line.icon.vue';
import CloseLineIcon from 'global/icons/close-line.icon.vue';
import MicLineIcon from 'global/icons/mic-line.icon.vue';


// props
defineProps<{ isDisabled: boolean }>();

// emits
const emit = defineEmits<{ (event: 'transcript', text: string, shouldSend: boolean): void; (event: 'active', isActive: boolean): void; (event: 'denied', hasDenied: boolean): void }>();

// stores
const store = useAssistantStore();

// variables
const MAXIMUM_SECONDS = 60;
const { isSupported, isRecording, seconds, levels, hasDenied, start, stop, cancel } = useVoiceRecorder(MAXIMUM_SECONDS, () => void handleStop(false));

// computed
const timerComputed = computed((): string => `${Math.floor(seconds.value / 60)}:${String(seconds.value % 60).padStart(2, '0')}`);

// watchers
watch(() => isRecording.value || store.transcribeStatus.isLoading, (isActive) => emit('active', isActive));
watch(hasDenied, (value) => emit('denied', value));

// event handlers
const handleStart = (): void => {
  void start();
};
const handleCancel = (): void => {
  cancel();
};
/** Ends the recording; the transcript lands in the field to review, or is sent at once when `shouldSend`. */
const handleStop = async (shouldSend: boolean): Promise<void> => {
  const recording = await stop();
  if (!recording) return;
  const text = await store.transcribe(recording.blob, recording.seconds);
  if (text) emit('transcript', text, shouldSend);
};
</script>

<style scoped>
.recorder {
  animation: recorder-in 0.3s var(--ease-premium);
}

.rec-dot {
  animation: rec-pulse 1.2s ease-in-out infinite;
}

@keyframes recorder-in {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
}

@keyframes rec-pulse {
  50% {
    opacity: 0.3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .recorder,
  .rec-dot {
    animation: none;
  }
}
</style>
