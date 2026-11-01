<template>
  <header class="flex items-center gap-3">
    <avatar-tag class="h-16 w-16 text-lg" :name="client.name" :kind="client.kind === 'company' ? 'company' : 'client'" />
    <div class="min-w-0 flex-1">
      <h2 class="heading-two truncate">{{ client.name }}</h2>
      <p class="body-two">{{ client.kind === 'company' ? 'Entreprise · ICE' : 'Particulier · CIN' }} {{ client.identifier }} · {{ client.region }}</p>
      <p class="body-two truncate">{{ formatPhone(client.phone) }}<template v-if="client.email"> · {{ client.email }}</template></p>
    </div>
  </header>
</template>

<script setup lang="ts">
// PROTOTYPE — Client avatar, name, identifier, region and contact above the Management Client detail (ticket 0030).
// imports
import { formatPhone } from 'global/composables/phone';
import type { IManagementClientPrototype } from 'client/prototype/mock-management-clients.prototype';

import AvatarTag from 'global/components/avatar-tag.vue';

// props
defineProps<{ client: IManagementClientPrototype }>();
</script>
