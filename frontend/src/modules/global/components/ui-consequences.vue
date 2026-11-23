<template>
  <div ref="root" class="flex flex-col gap-4 p-2" :class="{ 'items-center text-center': isCentered }" role="alertdialog" :aria-labelledby="titleId" :aria-describedby="listId" @keydown.esc.stop="emit('cancel')">
    <div class="flex flex-col gap-1">
      <h3 :id="titleId" :class="isCentered ? 'heading-two text-balance' : 'heading-four'">{{ title }}</h3>
      <p v-if="isDanger" class="text-sm font-medium text-fg-danger">{{ $t('global.consequences.irreversible') }}</p>
    </div>
    <div class="flex flex-col gap-2" :class="{ 'w-full max-w-lg rounded-card border border-subtle p-4 text-start': isCentered }">
      <p class="eyebrow">{{ $t('global.consequences.title') }}</p>
      <ul :id="listId" class="flex flex-col gap-2">
        <li v-for="line in lines" :key="line.text" class="flex items-start gap-2.5 text-sm text-fg-primary-paragraph">
          <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" :class="line.isKept ? 'bg-success-subtle text-fg-success' : isDanger ? 'bg-danger-subtle text-fg-danger' : 'bg-warning-subtle text-fg-warning'">
            <check-line-icon v-if="line.isKept" class="h-3 w-3" />
            <arrow-right-line-icon v-else class="h-3 w-3 rtl:-scale-x-100" />
          </span>
          <span class="max-w-prose">{{ line.text }}</span>
        </li>
      </ul>
    </div>
    <label v-if="confirmWord" class="flex w-full max-w-sm flex-col gap-1.5">
      <span class="text-sm transition-colors duration-300 ease-(--ease-premium)" :class="isAttempted && !isReadyComputed ? 'text-fg-danger' : 'text-fg-primary-paragraph'" :role="isAttempted && !isReadyComputed ? 'alert' : undefined">{{ $t('global.consequences.type', { word: confirmWord }) }}</span>
      <input v-model="typed" type="text" autocomplete="off" :placeholder="confirmWord" class="input min-h-11" :class="{ 'text-center': isCentered }" :aria-invalid="isAttempted && !isReadyComputed" @keydown.enter.prevent="handleConfirm" />
    </label>
    <div class="flex flex-wrap gap-2" :class="{ 'justify-center': isCentered }">
      <button type="button" class="btn-secondary min-h-11" :disabled="isBusy" @click="emit('cancel')">{{ $t('global.consequences.cancel') }}</button>
      <button type="button" class="btn-primary min-h-11" :class="{ 'bg-danger hover:bg-danger/90': isDanger }" :disabled="isBusy" :aria-busy="isBusy" @click="handleConfirm">{{ confirmLabel }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted, ref, useId } from 'vue';

import type { IConsequence } from 'global/types/consequence';

import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';
import CheckLineIcon from 'global/icons/check-line.icon.vue';

// props
/** What an action will do, read before it is done; a word to type when nothing brings it back. */
const props = withDefaults(defineProps<{ title: string; lines: IConsequence[]; confirmLabel: string; confirmWord?: string; isDanger?: boolean; isBusy?: boolean; isCentered?: boolean }>(), { confirmWord: undefined });

// emits
const emit = defineEmits<{ (event: 'cancel'): void; (event: 'confirm'): void }>();

// variables
const titleId = useId();
const listId = useId();
const root = ref<HTMLElement | null>(null);
const typed = ref('');
const isAttempted = ref(false);

// computed
const isReadyComputed = computed((): boolean => !props.confirmWord || typed.value.trim().toLowerCase() === props.confirmWord.toLowerCase());

// event handlers
const handleConfirm = (): void => {
  isAttempted.value = true;
  if (isReadyComputed.value) emit('confirm');
  else root.value?.querySelector('input')?.focus();
};

// lifecycle
/** The safe way out is under the finger first. */
onMounted(() => root.value?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true }));
</script>
