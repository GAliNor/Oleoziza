<template>
  <section v-if="syncStore.failedEntries.length || syncStore.hasStaleEntries" class="mb-6 flex flex-col gap-3" aria-live="polite">
    <p v-if="syncStore.hasStaleEntries" class="card bg-warning-subtle text-fg-warning body-two" role="status">{{ $t('global.sync.stale') }}</p>
    <article v-for="entry in syncStore.failedEntries" :key="entry.key" class="card flex flex-col gap-3 border border-danger sm:flex-row sm:items-center">
      <div class="min-w-0 flex-1">
        <p class="font-medium text-fg-display">{{ kindLabel(entry.kind) }}</p>
        <p class="body-two text-fg-danger">{{ errorLabel(entry.errorCode) }}</p>
      </div>
      <div class="flex shrink-0 gap-2">
        <button type="button" class="btn-secondary" @click="handleDiscard(entry.key)">{{ $t('global.sync.discard') }}</button>
        <button type="button" class="btn-primary" @click="handleRetry(entry.key)">{{ $t('global.sync.retry') }}</button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
// imports
import { useI18n } from 'vue-i18n';

import { outbox } from 'global/services/app-outbox';
import { useSyncStore } from 'global/stores/sync';

// stores
const syncStore = useSyncStore();
const { t, te } = useI18n();

// methods
const kindLabel = (kind: string): string => (te(`global.sync.kinds.${kind}`) ? t(`global.sync.kinds.${kind}`) : kind);
const errorLabel = (code: string | null): string => (code && te(`global.errors.${code}`) ? t(`global.errors.${code}`) : t('global.sync.refused'));

// event handlers
const handleRetry = (key: string): void => {
  void outbox.retry(key);
};

const handleDiscard = (key: string): void => {
  void outbox.discard(key);
};
</script>
