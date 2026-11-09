<template>
  <section class="flex flex-col gap-2">
    <h3 class="label">{{ title }}</h3>
    <ui-empty-state v-if="!lots.length" size="compact" :message="$t('finance.form.noLot')" />
    <div v-for="lot in lots" :key="lot.id" class="flex items-stretch gap-2">
    <label
      class="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-control border border-default p-3"
      :class="isDiscountPending(lot) ? 'opacity-60' : 'cursor-pointer hover:border-strong'"
    >
      <input
        class="h-5 w-5 shrink-0 accent-(--color-primary-olive-dark)"
        type="checkbox"
        :checked="modelValue.includes(lot.id)"
        :disabled="isDiscountPending(lot)"
        @change="handleToggle(lot.id)"
      />
      <span class="min-w-0 flex-1">
        <span class="block font-medium text-fg-display">{{ lot.code }}</span>
        <span class="body-two block truncate">{{ formatShortDate(lot.receivedAt) }} · {{ lot.variety }}</span>
        <span v-if="isDiscountPending(lot)" class="chip mt-1 bg-warning-subtle text-fg-warning">{{ $t('finance.form.discountPending') }}</span>
        <span v-else-if="lot.discount?.state === 'applied' || lot.discount?.state === 'approved'" class="chip mt-1 bg-selected text-fg-brand tabular-nums">{{ $t('finance.form.discountApplied', { amount: formatMoney(lot.discount.amountDh) }) }}</span>
      </span>
      <span class="shrink-0 font-semibold text-fg-display tabular-nums">{{ formatMoney(amountDue(lot)) }}</span>
    </label>
    <button v-if="canDiscount && canTakeDiscount(lot)" type="button" class="btn-secondary shrink-0 px-3" :aria-label="$t('finance.form.giveDiscountFor', { code: lot.code })" @click="emit('discount', lot)">
      <percent-line-icon class="h-5 w-5" />
      <span class="hidden sm:inline">{{ $t('finance.form.giveDiscount') }}</span>
    </button>
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { formatShortDate } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { amountDue, isDiscountPending } from 'lot/composables/fee';
import type { ILot } from 'lot/types/lot';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import PercentLineIcon from 'global/icons/percent-line.icon.vue';

// props
const props = defineProps<{ lots: ILot[]; modelValue: string[]; title: string; canDiscount?: boolean }>();

// emits
const emit = defineEmits<{
  (event: 'update:modelValue', ids: string[]): void;
  (event: 'discount', lot: ILot): void;
}>();

// methods
/** One Discount per Lot, given while something is left to pay; a refused one may be given again. */
const canTakeDiscount = (lot: ILot): boolean => (!lot.discount || lot.discount.state === 'refused') && amountDue(lot) > 0;

// event handlers
const handleToggle = (id: string): void => {
  emit('update:modelValue', props.modelValue.includes(id) ? props.modelValue.filter((item) => item !== id) : [...props.modelValue, id]);
};
</script>
