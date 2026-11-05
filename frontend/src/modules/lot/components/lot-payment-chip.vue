<template>
  <span class="chip" :class="PAYMENT_STATE_TONES[state]">{{ $t(`lot.payment.${state}`) }}</span>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { paymentStateOf } from 'lot/composables/fee';
import { PAYMENT_STATE_TONES } from 'lot/constants/lot';
import type { ILot, PaymentState } from 'lot/types/lot';

// props
const props = defineProps<{ lot: Pick<ILot, 'netKg' | 'millingRatePerKg' | 'discount' | 'paidDh' | 'pendingDh' | 'creditDh'> }>();

// computed
const state = computed((): PaymentState => paymentStateOf(props.lot));
</script>
