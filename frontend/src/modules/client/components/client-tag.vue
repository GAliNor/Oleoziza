<template>
  <router-link
    :to="{ name: 'client-page', params: { id: clientId } }"
    class="press-lift group flex min-w-0 items-center gap-3 rounded-card bg-surface/70 p-3 shadow-hairline
      hover:bg-surface
      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
  >
    <ui-avatar class="h-14 w-14 text-lg" :name="name" :variant="avatarVariant" fallback-class="bg-selected text-fg-brand" />
    <span class="min-w-0 flex-1">
      <span class="heading-five block truncate">{{ name }}</span>
      <span v-if="client" class="body-two block truncate">{{ formatPhone(client.phone) }} · {{ $t(`client.kinds.${client.kind}`) }}</span>
    </span>
    <span class="link flex shrink-0 items-center gap-1 group-hover:no-underline">
      <span class="hidden sm:inline">{{ $t('client.tag.open') }}</span>
      <arrow-right-line-icon class="h-4 w-4 transition-transform duration-300 ease-(--ease-premium) group-hover:translate-x-0.5" />
    </span>
  </router-link>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted } from 'vue';

import { useClientStore } from 'client/stores/client';
import { clientAvatarVariant } from 'client/composables/avatar-variant';
import { formatPhone } from 'global/composables/phone';
import type { IClient } from 'client/types/client';
import type { AvatarVariant } from 'global/types/avatar';

import UiAvatar from 'global/components/ui-avatar.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// props
const props = defineProps<{ clientId: string; name: string }>();

// stores
const clientStore = useClientStore();

// computed
const client = computed((): IClient | undefined => clientStore.clientById(props.clientId));
const avatarVariant = computed((): AvatarVariant | undefined => (client.value ? clientAvatarVariant(client.value.kind) : undefined));

// lifecycle
onMounted(() => {
  clientStore.fetchClients();
});
</script>
