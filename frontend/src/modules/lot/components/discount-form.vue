<template>
  <form :ref="setFormRoot" class="flex flex-col gap-3 rounded-card bg-subtle p-4" novalidate @submit.prevent="handleSave">
    <div class="flex items-baseline justify-between gap-3">
      <h4 class="heading-five">{{ $t('lot.discountForm.title', { code: lot.code }) }}</h4>
      <span class="body-two tabular-nums">{{ $t('lot.discountForm.due', { amount: formatMoney(due) }) }}</span>
    </div>
    <div class="flex items-center gap-2" data-field="amount">
      <ui-segmented v-model="entry" :options="entryOptions" :label="$t('lot.discountForm.entryLabel')" />
      <input
        v-model.number="typed"
        class="input min-w-0 flex-1 figure"
        type="number"
        inputmode="decimal"
        min="0"
        step="0.01"
        :aria-label="$t('lot.discountForm.amountLabel')"
        :aria-invalid="!!errorOf('amount')"
        @blur="touch('amount')"
      />
    </div>
    <p v-if="errorOf('amount')" class="form-error" role="alert">{{ errorOf('amount') }}</p>
    <template v-else-if="figures.amountDh">
      <p class="flex items-baseline justify-between gap-3 body-two tabular-nums">
        <span>{{ $t('lot.discountForm.figures', { percent: formatNumber(figures.percent, 2), amount: formatMoney(figures.amountDh) }) }}</span>
        <span v-if="!figures.isOverLimit" class="font-semibold text-fg-display">{{ formatMoney(due - figures.amountDh) }}</span>
      </p>
      <p v-if="figures.isOverLimit" class="rounded-control bg-warning-subtle p-2 body-two text-fg-warning" role="status">{{ $t('lot.discountForm.overLimit', { limit: limitPercent }) }}</p>
    </template>
    <div class="grid grid-cols-2 gap-2">
      <button type="button" class="btn-secondary" @click="emit('close')">{{ $t('lot.discountForm.cancel') }}</button>
      <button type="submit" class="btn-primary" :disabled="lotStore.isSaving">{{ $t(figures.isOverLimit ? 'lot.discountForm.ask' : 'lot.discountForm.apply') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { useFormFeedback } from 'global/composables/use-form-feedback';
import { createId } from 'global/composables/crypto';
import { formatMoney } from 'global/composables/money';
import { formatNumber } from 'global/composables/number';
import { amountDue, fullFee } from 'lot/composables/fee';
import { readDiscount, type DiscountEntry, type IDiscountFigures } from 'lot/composables/discount';
import type { ILot } from 'lot/types/lot';

import UiSegmented from 'global/components/ui-segmented.vue';

// props
const props = defineProps<{ lot: ILot; limitPercent: number }>();

// emits
const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'saved', lot: ILot): void;
}>();

// stores
const { t } = useI18n();
const lotStore = useLotStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();

// variables
const giftId = createId();
const entry = ref<DiscountEntry>('percent');
const typed = ref<number | ''>('');

// computed
const due = computed((): number => amountDue(props.lot));
const entryOptions = computed((): { key: DiscountEntry; label: string }[] => [
  { key: 'percent', label: '%' },
  { key: 'amount', label: t('global.units.dirham') },
]);
const figures = computed((): IDiscountFigures =>
  readDiscount(entry.value, typeof typed.value === 'number' ? typed.value : 0, fullFee(props.lot), props.limitPercent, sessionStore.session?.isOwner === true),
);
const isTooHigh = computed((): boolean => figures.value.amountDh > due.value);
const { setFormRoot, errorOf, touch, attempt } = useFormFeedback(() => [{ key: 'amount', label: t('lot.discountForm.amountLabel'), isMissing: !figures.value.amountDh, error: isTooHigh.value ? t('lot.discountForm.tooHigh', { amount: formatMoney(due.value) }) : null }]);

// methods
const save = async (): Promise<void> => {
  const { amountDh, percent, isOverLimit } = figures.value;
  const updated = await lotStore.giveDiscount(props.lot, { id: giftId, amountDh, percent, isOverLimit });
  if (!updated) {
    toastStore.push(t('lot.discountForm.error'), 'danger');
    return;
  }
  toastStore.push(t(isOverLimit ? 'lot.discountForm.asked' : 'lot.discountForm.applied', { code: updated.code }), 'success');
  emit('saved', updated);
};

// event handlers
const handleSave = (): void => attempt(save);
</script>
