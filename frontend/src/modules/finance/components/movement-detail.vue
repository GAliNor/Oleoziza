<template>
  <div class="stagger flex flex-col gap-4">
    <header class="flex flex-wrap items-start gap-3">
      <span class="round-badge h-12 w-12" :class="movement.kind === 'payment' ? 'bg-selected text-fg-brand' : 'bg-accent-subtle text-fg-accent'">
        {{ movement.kind === 'payment' ? '↓' : '↑' }}
      </span>
      <div class="min-w-0 flex-1">
        <p class="eyebrow">{{ movement.code }} · {{ $t(`finance.kinds.${movement.kind}`) }} · {{ $t(`finance.purposes.${movement.purpose}`) }}</p>
        <h2 class="heading-four truncate">{{ movement.client }}</h2>
        <p class="body-two">{{ movement.label }}</p>
      </div>
      <div class="text-right">
        <p class="text-display-sm figure" :class="movement.kind === 'payment' ? 'text-fg-brand' : 'text-fg-accent'">
          {{ movement.kind === 'payment' ? '+' : '−' }}{{ formatMoney(movement.amount) }}
        </p>
        <span class="chip" :class="MOVEMENT_STATUS_TONES[movement.status]">{{ $t(`finance.statuses.${movement.status}`) }}</span>
      </div>
    </header>

    <div class="grid gap-4 md:grid-cols-[1fr_minmax(0,18rem)]">
      <dl class="card grid content-start gap-3 rounded-2xl sm:grid-cols-2">
        <div>
          <dt class="label">{{ $t('finance.register.columns.method') }}</dt>
          <dd class="text-fg-display">{{ $t(`finance.methods.${movement.method}`) }}<span v-if="movement.oilKg"> · {{ formatOilKg(movement.oilKg) }}</span></dd>
        </div>
        <div v-if="movement.reference">
          <dt class="label">{{ $t('finance.detail.reference') }}</dt>
          <dd class="text-fg-display">{{ movement.reference }}</dd>
        </div>
        <div>
          <dt class="label">{{ $t('finance.register.columns.recordedBy') }}</dt>
          <dd class="text-fg-display">
            {{ movement.recordedBy }} · {{ formatDateTime(movement.recordedAt) }}
            <span v-if="movement.wasOffline" class="chip ml-1 bg-info-subtle text-fg-info">{{ $t('finance.detail.offline') }}</span>
          </dd>
        </div>
        <div>
          <dt class="label">{{ $t('finance.detail.site') }}</dt>
          <dd class="text-fg-display">{{ siteName }}</dd>
        </div>
        <div v-if="movement.feeOffset" class="sm:col-span-2">
          <dt class="label">{{ $t('finance.detail.offset') }}</dt>
          <dd class="text-fg-display tabular-nums">
            {{ $t('finance.detail.offsetLine', { gross: formatMoney(movement.amount + movement.feeOffset), fee: formatMoney(movement.feeOffset), net: formatMoney(movement.amount) }) }}
          </dd>
        </div>
        <div v-if="movement.decidedBy" class="sm:col-span-2">
          <dt class="label">{{ $t('finance.detail.decidedBy', { status: $t(`finance.statuses.${movement.status}`) }) }}</dt>
          <dd class="text-fg-display">
            {{ movement.decidedBy }} · {{ formatDateTime(movement.decidedAt!) }}
            <span v-if="movement.settlement" class="chip ml-1 bg-subtle text-fg-primary-paragraph">{{ $t(`finance.settlements.${movement.settlement}.label`) }}</span>
          </dd>
          <dd v-if="movement.note" class="body-two mt-1">« {{ movement.note }} »</dd>
        </div>
      </dl>

      <figure class="card flex flex-col gap-2 rounded-2xl">
        <figcaption class="label">{{ $t('finance.detail.proof') }}</figcaption>
        <button v-if="movement.proofUrl" type="button" class="overflow-hidden rounded-xl ring-1 ring-default transition hover:ring-brand" @click="isProofOpen = true">
          <img :src="movement.proofUrl" :alt="$t('finance.detail.proofAlt')" class="w-full" />
        </button>
        <p v-else class="body-two">{{ $t(movement.method === 'cash' ? 'finance.detail.noProofCash' : 'finance.detail.noProof') }}</p>
      </figure>
    </div>

    <p v-if="isReadOnly" class="card bg-page body-two">{{ $t('finance.detail.readOnly') }}</p>
    <p v-else-if="!isOnline && (movement.status === 'pending' || movement.status === 'confirmed')" class="card border-warning-subtle bg-warning-subtle body-two">
      {{ $t('finance.detail.offlineHint') }}
    </p>

    <div v-if="movement.status === 'pending' && canConfirm" class="card flex flex-col gap-3 rounded-2xl">
      <template v-if="mode === 'reject'">
        <ui-field v-slot="{ id }" :label="$t('finance.detail.rejectReason')">
          <textarea :id="id" v-model="note" class="input min-h-20" :placeholder="$t('finance.detail.rejectPlaceholder')" />
        </ui-field>
        <p v-if="movement.method === 'oil'" class="body-two">{{ $t('finance.detail.oilReturns', { quantity: formatOilKg(movement.oilKg ?? 0) }) }}</p>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="btn-secondary" @click="mode = 'idle'">{{ $t('finance.detail.back') }}</button>
          <button type="button" class="btn-primary bg-danger hover:bg-danger/90" :disabled="!note.trim() || !isOnline || financeStore.isSaving" @click="handleReject">{{ $t('finance.detail.reject') }}</button>
        </div>
      </template>
      <div v-else class="flex flex-wrap gap-2">
        <button type="button" class="btn-primary flex-1" :disabled="!isOnline || financeStore.isSaving" @click="handleConfirm">{{ $t('finance.detail.confirm', { amount: formatMoney(movement.amount) }) }}</button>
        <button type="button" class="btn-secondary text-fg-danger" @click="mode = 'reject'">{{ $t('finance.detail.rejectStart') }}</button>
      </div>
    </div>

    <div v-else-if="movement.status === 'confirmed' && movement.kind === 'payment' && canCancel" class="card flex flex-col gap-3 rounded-2xl">
      <template v-if="mode === 'cancel'">
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
          <button type="button" class="btn-secondary" @click="mode = 'idle'">Retour</button>
          <button type="button" class="btn-primary bg-danger hover:bg-danger/90" :disabled="!note.trim() || !isOnline || financeStore.isSaving" @click="handleCancel">{{ $t('finance.detail.cancel') }}</button>
        </div>
      </template>
      <button v-else type="button" class="btn-secondary self-start text-fg-danger" @click="mode = 'cancel'">{{ $t('finance.detail.cancelStart') }}</button>
    </div>

    <div v-if="isProofOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm" @click.self="isProofOpen = false">
      <img v-if="movement.proofUrl" :src="movement.proofUrl" :alt="$t('finance.detail.proofAlt')" class="max-h-[85dvh] w-full max-w-2xl rounded-2xl bg-surface" />
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';

import { useFinanceStore } from 'finance/stores/finance';
import { useSiteStore } from 'site/stores/site';
import { useFinance } from 'finance/composables/use-finance';
import { formatDateTime } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { formatOilKg } from 'lot/composables/quantity';
import { MOVEMENT_STATUS_TONES } from 'finance/constants/finance';
import type { IMovement, Settlement } from 'finance/types/finance';

import UiField from 'global/components/ui-field.vue';

// props
const props = defineProps<{ movement: IMovement }>();

// stores
const financeStore = useFinanceStore();
const siteStore = useSiteStore();
const { isOnline, isReadOnly, canConfirm, canCancel, confirm, reject, cancel } = useFinance();

// variables
const SETTLEMENTS: Settlement[] = ['credit_note', 'refund'];
const mode = ref<'idle' | 'reject' | 'cancel'>('idle');
const note = ref('');
const settlement = ref<Settlement>('credit_note');
const isProofOpen = ref(false);

// computed
const siteName = computed((): string => siteStore.sites.find((site) => site.id === props.movement.siteId)?.name ?? '—');

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
