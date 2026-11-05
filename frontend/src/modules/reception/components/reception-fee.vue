<template>
  <section class="flex flex-col gap-3 rounded-card bg-subtle p-4">
    <p class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span class="body-two tabular-nums">{{ $t('reception.fee.line', { weight: formatKg(netKg), rate: formatMoney(ratePerKg) }) }}</span>
      <span class="text-xl figure text-fg-display">{{ formatMoney(fee) }}</span>
    </p>

    <button v-if="!isOpen" type="button" class="link self-start" @click="isOpen = true">{{ $t('reception.fee.add') }}</button>
    <div v-else class="flex flex-col gap-2 border-t border-default pt-3">
      <div class="flex items-center gap-2">
        <ui-segmented v-model="entry" :options="entryOptions" :label="$t('reception.fee.entryLabel')" />
        <input
          v-model.number="typed"
          class="input min-w-0 flex-1 figure"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          :aria-label="$t('reception.fee.title')"
          :aria-invalid="figures.isTooHigh"
        />
      </div>
      <p v-if="figures.isTooHigh" class="form-error">{{ $t('reception.fee.tooHigh', { fee: formatMoney(fee) }) }}</p>
      <template v-else-if="figures.amountDh">
        <p class="flex items-baseline justify-between gap-3 body-two tabular-nums">
          <span>{{ $t('reception.fee.discount', { percent: formatNumber(figures.percent, 2), amount: formatMoney(figures.amountDh) }) }}</span>
          <span v-if="!figures.isOverLimit" class="font-semibold text-fg-display">{{ formatMoney(fee - figures.amountDh) }}</span>
        </p>
        <p v-if="figures.isOverLimit" class="rounded-control bg-warning-subtle p-2 body-two text-fg-warning" role="status">{{ $t('reception.fee.overLimit', { limit: limitPercent }) }}</p>
      </template>
      <button type="button" class="link self-start" @click="handleRemove">{{ $t('reception.fee.remove') }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSessionStore } from 'global/stores/session';
import { formatMoney } from 'global/composables/money';
import { formatNumber } from 'global/composables/number';
import { fullFee } from 'lot/composables/fee';
import { readDiscount, type DiscountEntry, type IDiscountFigures } from 'lot/composables/discount';
import { formatKg } from 'lot/composables/quantity';

import UiSegmented from 'global/components/ui-segmented.vue';

// props
const props = defineProps<{ netKg: number; ratePerKg: number; limitPercent: number }>();

// emits
const emit = defineEmits<{ (event: 'update:discount', figures: IDiscountFigures | null): void }>();

// stores
const { t } = useI18n();
const sessionStore = useSessionStore();

// variables
const isOpen = ref(false);
const entry = ref<DiscountEntry>('percent');
const typed = ref<number | ''>('');

// computed
const fee = computed((): number => fullFee({ netKg: props.netKg, millingRatePerKg: props.ratePerKg }));
const entryOptions = computed((): { key: DiscountEntry; label: string }[] => [
  { key: 'percent', label: '%' },
  { key: 'amount', label: t('global.units.dirham') },
]);
const figures = computed((): IDiscountFigures => readDiscount(entry.value, typeof typed.value === 'number' ? typed.value : 0, fee.value, props.limitPercent, sessionStore.session?.isOwner === true));

// watchers
watch(figures, (value) => emit('update:discount', value.amountDh > 0 ? value : null));

// event handlers
const handleRemove = (): void => {
  typed.value = '';
  isOpen.value = false;
};
</script>
