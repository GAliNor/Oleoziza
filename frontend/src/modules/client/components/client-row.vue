<template>
  <ui-avatar :name="client.name" fallback-class="bg-subtle text-fg-primary-paragraph" />
  <span class="min-w-0 flex-1">
    <span class="block truncate font-medium text-fg-display">{{ client.name }}</span>
    <span class="body-two block truncate">{{ formatPhone(client.phone) }}</span>
  </span>
  <span v-if="client.kind === 'company'" class="chip bg-accent-subtle text-fg-accent">{{ $t('client.kinds.company') }}</span>
</template>

<script setup lang="ts">
// imports
import { formatPhone } from 'global/composables/phone';
import type { IClient } from 'client/types/client';

import UiAvatar from 'global/components/ui-avatar.vue';

// props
defineProps<{ client: IClient }>();
</script>
