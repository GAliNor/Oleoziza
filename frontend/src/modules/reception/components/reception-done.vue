<template>
  <section class="rise mx-auto flex w-full max-w-md flex-col items-center gap-5 py-6 text-center">
    <span class="flex h-20 w-20 items-center justify-center rounded-full bg-selected">
      <animated-check-icon class="h-10 w-10 text-fg-brand" />
    </span>
    <div>
      <p class="eyebrow text-sm">{{ lot.code }} · {{ $t('reception.done.waiting') }}</p>
      <h2 class="display-md mt-1 tabular-nums">{{ formatKg(lot.netKg) }}</h2>
      <p class="body-one">{{ formatQuintals(lot.netKg) }} · {{ lot.clientName }}</p>
      <p v-if="lot.boxNumbers.length" class="heading-two mt-3 text-fg-brand tabular-nums">{{ formatBoxes(lot.boxNumbers) }}</p>
      <template v-if="isAmountShown">
      <p class="body-one mt-3 tabular-nums">{{ $t('reception.done.fee', { amount: formatMoney(millingFee(lot)) }) }}</p>
      <p v-if="lot.discount?.state === 'applied'" class="body-two tabular-nums">{{ $t('reception.done.discount', { full: formatMoney(fullFee(lot)), amount: formatMoney(lot.discount.amountDh) }) }}</p>
      <p v-else-if="lot.discount?.state === 'pending'" class="mt-1 chip bg-warning-subtle text-fg-warning tabular-nums">{{ $t('reception.done.discountPending', { amount: formatMoney(lot.discount.amountDh) }) }}</p>
      <p v-if="lot.creditDh" class="body-two tabular-nums">{{ $t('reception.done.credit', { amount: formatMoney(lot.creditDh) }) }}</p>
      <p v-if="lot.dailyPricePerKg !== null" class="body-two mt-1">
        {{ $t('reception.done.purchase', { price: formatMoney(lot.dailyPricePerKg), amount: formatMoney(lot.netKg * lot.dailyPricePerKg) }) }}
      </p>
      </template>
    </div>
    <span v-if="lot.isPendingSync" class="chip bg-warning-subtle text-fg-warning">{{ $t('reception.pendingSync') }}</span>
    <div class="flex w-full flex-col gap-2">
      <button type="button" class="btn-primary min-h-14" @click="handlePrint">{{ $t('reception.done.print') }}</button>
      <div class="grid grid-cols-2 gap-2">
        <router-link :to="{ name: 'reception-new' }" class="btn-secondary" @click="emit('again')">{{ $t('reception.done.again') }}</router-link>
        <router-link :to="{ name: 'dashboard' }" class="btn-secondary">{{ $t('reception.done.home') }}</router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useToastStore } from 'global/stores/toast';
import { useSiteStore } from 'site/stores/site';
import { AMOUNT_PERMISSIONS } from 'finance/constants/finance';
import type { ILot } from 'lot/types/lot';
import { formatMoney } from 'global/composables/money';
import { fullFee, millingFee } from 'lot/composables/fee';
import { formatBoxes } from 'lot/composables/lot-boxes';
import { formatKg, formatQuintals } from 'lot/composables/quantity';

import AnimatedCheckIcon from 'global/icons/animated-check.icon.vue';

// props
const props = defineProps<{ lot: ILot }>();

// emits
const emit = defineEmits<{ (event: 'again'): void }>();

// stores
const { t } = useI18n();
const toastStore = useToastStore();
const siteStore = useSiteStore();

// computed
const isAmountShown = computed((): boolean => siteStore.can(AMOUNT_PERMISSIONS));

// event handlers
const handlePrint = (): void => {
  toastStore.push(t('reception.done.printed', { code: props.lot.code }), 'success');
};
</script>
