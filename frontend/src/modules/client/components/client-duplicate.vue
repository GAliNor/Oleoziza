<template>
  <div class="flex flex-col gap-3 rounded-card bg-warning-subtle p-4" role="status">
    <p class="min-w-0">
      <span class="block text-sm font-semibold text-fg-display">{{ title }}</span>
      <span class="body-two block tabular-nums">{{ formatPhone(client.phone) }}</span>
    </p>
    <div class="grid gap-2 sm:grid-cols-2">
      <router-link class="btn-secondary min-h-14 bg-surface px-3 hover:bg-surface" :to="{ name: 'client-page', params: { id: client.id } }">{{ $t('client.quick.openDuplicate') }}</router-link>
      <button v-if="canReceive" type="button" class="btn-primary min-h-14 px-3" @click="emit('receive', client.id)">{{ $t('client.quick.receiveDuplicate') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { formatPhone } from 'global/composables/phone';
import type { IClient } from 'client/types/client';

// props
defineProps<{ client: IClient; title: string; canReceive: boolean }>();

// emits
const emit = defineEmits<{ (event: 'receive', clientId: string): void }>();
</script>
