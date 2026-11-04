<template>
  <header class="flex items-center gap-3">
    <ui-avatar class="h-16 w-16 text-lg" :name="client.name" :variant="clientAvatarVariant(client.kind)" />
    <div class="min-w-0 flex-1">
      <h2 class="heading-four truncate">{{ client.name }}</h2>
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

import { clientAvatarVariant } from 'client/composables/avatar-variant';
import UiAvatar from 'global/components/ui-avatar.vue';

// props
defineProps<{ client: IManagementClientPrototype }>();
</script>
