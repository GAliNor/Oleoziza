<template>
  <form class="card flex flex-col gap-4 p-5" @submit.prevent="handleSave">
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h4 class="heading-five">{{ $t('lot.rateForm.title', { code: lot.code }) }}</h4>
      <span class="body-two tabular-nums">{{ $t('lot.rateForm.current', { rate: formatMoney(lot.millingRatePerKg) }) }}</span>
    </div>
    <ui-field v-slot="{ id }" :label="$t('lot.rateForm.rate')">
      <div class="relative">
        <input
          :id="id"
          v-model.number="rateTyped"
          class="input pe-20 text-xl figure"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          :aria-invalid="isTooLowComputed"
        />
        <span class="pointer-events-none absolute top-1/2 inset-e-4 -translate-y-1/2 body-two">{{ $t('lot.rateForm.unit') }}</span>
      </div>
      <p v-if="isTooLowComputed" class="form-error">{{ $t('lot.rateForm.tooLow', { rate: formatMoney(minRateComputed) }) }}</p>
      <p v-else-if="isChangedComputed" class="body-two tabular-nums">{{ $t('lot.rateForm.fee', { from: formatMoney(millingFee(lot)), to: formatMoney(newFeeComputed) }) }}</p>
    </ui-field>
    <ui-field v-slot="{ id }" :label="$t('lot.rateForm.reason')">
      <textarea :id="id" v-model="reason" class="input min-h-20" maxlength="500" :placeholder="$t('lot.rateForm.reasonPlaceholder')" />
    </ui-field>
    <div class="grid grid-cols-2 gap-3">
      <button type="button" class="btn-secondary" @click="emit('close')">{{ $t('lot.rateForm.cancel') }}</button>
      <button type="submit" class="btn-primary" :disabled="!canSaveComputed">{{ $t('lot.rateForm.save') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useLotStore } from 'lot/stores/lot';
import { useToastStore } from 'global/stores/toast';
import { createId } from 'global/composables/crypto';
import { formatMoney } from 'global/composables/money';
import { lowestRate, millingFee, rateFee } from 'lot/composables/fee';
import type { ILot } from 'lot/types/lot';

import UiField from 'global/components/ui-field.vue';

// props
const props = defineProps<{ lot: ILot }>();

// emits
const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'saved', lot: ILot): void;
}>();

// stores
const { t } = useI18n();
const lotStore = useLotStore();
const toastStore = useToastStore();

// variables
const correctionId = createId();
const rateTyped = ref<number | ''>(props.lot.millingRatePerKg);
const reason = ref('');

// computed
const rateComputed = computed((): number => (typeof rateTyped.value === 'number' ? Math.round(rateTyped.value * 100) / 100 : -1));
const minRateComputed = computed((): number => lowestRate(props.lot));
const isTooLowComputed = computed((): boolean => rateComputed.value >= 0 && rateComputed.value < minRateComputed.value);
const isChangedComputed = computed((): boolean => rateComputed.value >= 0 && rateComputed.value !== props.lot.millingRatePerKg);
const newFeeComputed = computed((): number => rateFee(props.lot, rateComputed.value));
const canSaveComputed = computed((): boolean => isChangedComputed.value && !isTooLowComputed.value && !!reason.value.trim() && !lotStore.isSaving);

// event handlers
const handleSave = async (): Promise<void> => {
  if (!canSaveComputed.value) return;
  const updated = await lotStore.correctRate(props.lot, { id: correctionId, millingRatePerKg: rateComputed.value, reason: reason.value.trim() });
  if (!updated) return;
  toastStore.push(t('lot.rateForm.saved', { code: updated.code, rate: formatMoney(updated.millingRatePerKg) }), 'success');
  emit('saved', updated);
};
</script>
