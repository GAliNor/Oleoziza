<template>
  <div class="flex flex-col gap-2">
    <ul v-if="documents.length" class="grid grid-cols-2 gap-2">
      <li v-for="document in documents" :key="document.id">
        <a :href="document.url" :download="document.name" target="_blank" rel="noopener" class="group flex h-full flex-col gap-1 rounded-card bg-emphasis/40 p-2 hover:bg-emphasis/70">
          <span v-if="document.isPdf" class="flex h-24 items-center justify-center rounded-control bg-surface text-sm font-semibold text-fg-primary-paragraph">PDF</span>
          <img v-else :src="document.url" :alt="document.name" class="h-24 w-full rounded-control object-contain" />
          <span class="truncate body-three">{{ document.name }}</span>
        </a>
      </li>
    </ul>
    <p v-else class="body-two rounded-card bg-emphasis/40 p-4 text-center">{{ emptyMessage }}</p>
    <label v-if="canAdd" class="btn-secondary cursor-pointer self-start">
      {{ $t('finance.documents.add') }}
      <input class="sr-only" type="file" accept="image/*,application/pdf" multiple @change="handlePick" />
    </label>
  </div>
</template>

<script setup lang="ts">
// imports
import type { IPaymentDocument } from 'finance/types/finance';

// props
defineProps<{ documents: IPaymentDocument[]; emptyMessage: string; canAdd?: boolean }>();

// emits
const emit = defineEmits<{ (event: 'add', files: File[]): void }>();

// event handlers
const handlePick = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  emit('add', [...(input.files ?? [])]);
  input.value = '';
};
</script>
