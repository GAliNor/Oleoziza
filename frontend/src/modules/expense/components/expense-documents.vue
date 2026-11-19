<template>
  <div class="flex flex-col gap-3">
    <TransitionGroup v-if="documents.length" tag="ul" name="row-in" class="grid grid-cols-2 gap-2 @xl:grid-cols-4">
      <li v-for="document in documents" :key="document.id" class="group relative">
        <a :href="document.url" :download="document.name" target="_blank" rel="noopener" class="flex h-full flex-col gap-1 rounded-card bg-emphasis/40 p-2 hover:bg-emphasis/70">
          <span v-if="document.isPdf" class="flex h-24 items-center justify-center rounded-control bg-surface text-sm font-semibold text-fg-primary-paragraph">PDF</span>
          <img v-else :src="document.url" :alt="document.name" class="h-24 w-full rounded-control object-contain" />
          <span class="truncate body-three">{{ document.name }}</span>
        </a>
        <button type="button" class="icon-btn absolute top-1 inset-e-1 h-8 w-8 bg-surface shadow-raised" :aria-label="$t('expense.form.removeDocument', { name: document.name })" @click="emit('remove', document.id)">
          <close-line-icon class="h-4 w-4" />
        </button>
      </li>
    </TransitionGroup>
    <ui-drop-zone :is-disabled="isReading" @files="emit('add', $event)" />
    <p v-if="isReading" class="body-three" role="status">{{ $t('global.photo.reading') }}</p>
  </div>
</template>

<script setup lang="ts">
// imports
import type { IExpenseDocument } from 'expense/types/expense';

import UiDropZone from 'global/components/ui-drop-zone.vue';
import CloseLineIcon from 'global/icons/close-line.icon.vue';

// props
defineProps<{ documents: IExpenseDocument[]; isReading: boolean }>();

// emits
const emit = defineEmits<{ (event: 'add', files: File[]): void; (event: 'remove', id: string): void }>();
</script>
