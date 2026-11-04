<template>
  <div class="stagger grid gap-5 rounded-card bg-subtle p-3 shadow-hairline sm:p-6 xl:grid-cols-[minmax(0,1fr)_30rem] xl:grid-rows-[auto_1fr_auto] xl:gap-x-8">
    <client-tag :client-id="movement.clientId" :name="movement.client" />

    <movement-ticket class="mx-auto w-full max-w-lg xl:col-start-2 xl:row-span-3 xl:row-start-1 xl:max-w-none" :movement="movement" />

    <div class="flex min-w-0 flex-col gap-5">
      <movement-recap :movement="movement" />

      <figure class="flex min-w-0 flex-1 flex-col gap-2">
        <figcaption class="eyebrow">{{ $t('finance.detail.proof') }}</figcaption>
        <button
          v-if="movement.proofUrl"
          type="button"
          class="group flex min-h-56 flex-1 items-center justify-center rounded-card bg-emphasis/40 p-5 transition-colors duration-300 ease-(--ease-premium) hover:bg-emphasis/70
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          @click="isProofOpen = true"
        >
          <img
            :src="movement.proofUrl"
            :alt="$t('finance.detail.proofAlt')"
            class="max-h-56 max-w-full rounded-card shadow-raised transition-transform duration-500 ease-(--ease-premium) group-hover:scale-[1.02]"
          />
        </button>
        <p v-else class="body-two flex min-h-32 flex-1 items-center justify-center rounded-card bg-emphasis/40 p-4 text-center">
          {{ $t(movement.method === 'cash' ? 'finance.detail.noProofCash' : 'finance.detail.noProof') }}
        </p>
      </figure>
    </div>

    <div class="flex min-w-0 flex-col gap-3">
      <p v-if="isReadOnly" class="body-two rounded-card bg-surface/70 p-4 shadow-hairline">{{ $t('finance.detail.readOnly') }}</p>
      <p v-else-if="!isOnline && (movement.status === 'pending' || movement.status === 'confirmed')" class="body-two rounded-card border border-warning-subtle bg-warning-subtle p-4">
        {{ $t('finance.detail.offlineHint') }}
      </p>

      <template v-if="movement.status === 'pending' && canConfirm">
        <div v-if="mode === 'reject'" class="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-hairline">
          <ui-field v-slot="{ id }" :label="$t('finance.detail.rejectReason')">
            <textarea :id="id" v-model="note" class="input min-h-20" :placeholder="$t('finance.detail.rejectPlaceholder')" />
          </ui-field>
          <p v-if="movement.method === 'oil'" class="body-two">{{ $t('finance.detail.oilReturns', { quantity: formatOilKg(movement.oilKg ?? 0) }) }}</p>
          <div class="flex flex-wrap justify-end gap-2">
            <button type="button" class="btn-secondary" @click="mode = 'idle'">{{ $t('finance.detail.back') }}</button>
            <button type="button" class="btn-primary bg-danger hover:bg-danger/90" :disabled="!note.trim() || !isOnline || financeStore.isSaving" @click="handleReject">{{ $t('finance.detail.reject') }}</button>
          </div>
        </div>
        <div v-else class="flex flex-col items-center gap-1">
          <button type="button" class="btn-primary min-h-14 w-full text-md" :disabled="!isOnline || financeStore.isSaving" @click="handleConfirm">{{ $t('finance.detail.confirm', { amount: formatMoney(movement.amount) }) }}</button>
          <button type="button" class="btn-plain text-fg-danger hover:bg-danger-subtle" @click="mode = 'reject'">{{ $t('finance.detail.rejectStart') }}</button>
        </div>
      </template>

      <template v-else-if="movement.status === 'confirmed' && movement.kind === 'payment' && canCancel">
        <div v-if="mode === 'cancel'" class="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-hairline">
          <ui-field v-slot="{ id }" :label="$t('finance.detail.cancelReason')">
            <textarea :id="id" v-model="note" class="input min-h-20" :placeholder="$t('finance.detail.cancelPlaceholder')" />
          </ui-field>
          <div class="grid gap-2 sm:grid-cols-2">
            <button
              v-for="key in SETTLEMENTS"
              :key="key"
              type="button"
              class="toggle-tile text-left"
              :class="{ 'toggle-tile-active': settlement === key }"
              @click="settlement = key"
            >
              {{ $t(`finance.settlements.${key}.label`) }}
              <span class="block text-xs font-normal opacity-80">{{ $t(`finance.settlements.${key}.hint`) }}</span>
            </button>
          </div>
          <div class="flex flex-wrap justify-end gap-2">
            <button type="button" class="btn-secondary" @click="mode = 'idle'">{{ $t('finance.detail.back') }}</button>
            <button type="button" class="btn-primary bg-danger hover:bg-danger/90" :disabled="!note.trim() || !isOnline || financeStore.isSaving" @click="handleCancel">{{ $t('finance.detail.cancel') }}</button>
          </div>
        </div>
        <button v-else type="button" class="btn-plain self-center text-fg-danger hover:bg-danger-subtle" @click="mode = 'cancel'">{{ $t('finance.detail.cancelStart') }}</button>
      </template>
    </div>

    <div v-if="isProofOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm" @click.self="isProofOpen = false">
      <img v-if="movement.proofUrl" :src="movement.proofUrl" :alt="$t('finance.detail.proofAlt')" class="max-h-[85dvh] w-full max-w-2xl rounded-card bg-surface" />
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { ref, watch } from 'vue';

import { useFinanceStore } from 'finance/stores/finance';
import { useFinance } from 'finance/composables/use-finance';
import { formatMoney } from 'global/composables/money';
import { formatOilKg } from 'lot/composables/quantity';
import type { IMovement, Settlement } from 'finance/types/finance';

import UiField from 'global/components/ui-field.vue';
import ClientTag from 'client/components/client-tag.vue';
import MovementRecap from 'finance/components/movement-recap.vue';
import MovementTicket from 'finance/components/movement-ticket.vue';

// props
const props = defineProps<{ movement: IMovement }>();

// stores
const financeStore = useFinanceStore();
const { isOnline, isReadOnly, canConfirm, canCancel, confirm, reject, cancel } = useFinance();

// variables
const SETTLEMENTS: Settlement[] = ['credit_note', 'refund'];
const mode = ref<'idle' | 'reject' | 'cancel'>('idle');
const note = ref('');
const settlement = ref<Settlement>('credit_note');
const isProofOpen = ref(false);

// watchers
watch(
  () => props.movement.id,
  () => {
    mode.value = 'idle';
    note.value = '';
  },
);

// event handlers
const handleConfirm = (): void => {
  confirm(props.movement);
};

const handleReject = (): void => {
  reject(props.movement, note.value);
};

const handleCancel = (): void => {
  cancel(props.movement, note.value, settlement.value);
};
</script>
