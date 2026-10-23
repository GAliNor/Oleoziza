<template>
  <header class="flex items-center gap-3">
    <span class="avatar h-12 w-12 bg-primary-olive-dark text-white">{{ client.name.slice(0, 2).toUpperCase() }}</span>
    <div class="min-w-0 flex-1">
      <h2 class="heading-two truncate">{{ client.name }}</h2>
      <p class="body-two">{{ formatPhone(client.phone) }} · {{ client.kind === 'company' ? 'Entreprise' : 'Particulier' }}</p>
    </div>
    <button v-if="isClosable" type="button" class="icon-btn hidden lg:inline-flex" aria-label="Fermer" @click="emit('close')">
      <close-line-icon class="h-5 w-5" />
    </button>
  </header>
</template>

<script setup lang="ts">
// PROTOTYPE — Client name, phone and kind above the Management Client detail (ticket 0030).
// imports
import { formatPhone } from 'global/composables/phone';
import type { IManagementClientPrototype } from 'client/prototype/mock-management-clients.prototype';

import CloseLineIcon from 'global/icons/close-line.icon.vue';

// props
withDefaults(defineProps<{ client: IManagementClientPrototype; isClosable?: boolean }>(), { isClosable: false });

// emits
const emit = defineEmits<{ close: [] }>();
</script>
