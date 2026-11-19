<template>
  <payment-form
    :client-id="clientId"
    :client-name="clientName"
    :site-id="siteId"
    :oil-stock-litres="clientStore.accountOf(clientId).oilStockLitres"
    :credit-dh="clientStore.clientById(clientId)?.creditDh ?? 0"
    :lot-ids="lotIds"
    @close="emit('close')"
    @saved="emit('saved')"
  />
</template>

<script setup lang="ts">
// imports
import { useClientStore } from 'client/stores/client';

import PaymentForm from 'finance/components/payment-form.vue';

// props
defineProps<{ clientId: string; clientName: string; siteId: string; lotIds: string[] }>();

// emits
const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'saved'): void;
}>();

// stores
const clientStore = useClientStore();
</script>
