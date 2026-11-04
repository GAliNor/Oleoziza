<template>
  <header class="flex items-center gap-3">
    <ui-avatar class="h-16 w-16 text-lg" :name="client.name" :variant="clientAvatarVariant(client.kind)" />
    <div class="min-w-0 flex-1">
      <h2 class="heading-four truncate">{{ client.name }}</h2>
      <p class="body-two">{{ $t(`client.kinds.${client.kind}`) }} · {{ $t(`client.identifierKinds.${client.kind}`) }} {{ client.identifier }} · {{ client.region }}</p>
      <p class="body-two truncate">{{ formatPhone(client.phone) }}<template v-if="client.email"> · {{ client.email }}</template></p>
    </div>
  </header>
</template>

<script setup lang="ts">
// imports
import { formatPhone } from 'global/composables/phone';
import { clientAvatarVariant } from 'client/composables/avatar-variant';
import type { IClientRecord } from 'client/types/client';

import UiAvatar from 'global/components/ui-avatar.vue';

// props
defineProps<{ client: IClientRecord }>();
</script>
