<template>
  <div class="stagger grid gap-5 rounded-card bg-subtle p-3 shadow-hairline sm:p-6 xl:grid-cols-[minmax(0,1fr)_30rem] xl:grid-rows-[auto_1fr_auto] xl:gap-x-8">
    <client-tag :client-id="movement.clientId" :name="movement.client" />

    <movement-ticket class="mx-auto w-full max-w-lg xl:col-start-2 xl:row-span-3 xl:row-start-1 xl:max-w-none" :movement="movement" />

    <div class="flex min-w-0 flex-col gap-5">
      <movement-recap :movement="movement" />

      <section class="flex min-w-0 flex-1 flex-col gap-2">
        <h3 class="eyebrow">{{ $t('finance.documents.title') }}</h3>
        <document-list
          :documents="movement.documents"
          :empty-message="$t(movement.method === 'cash' ? 'finance.detail.noProofCash' : 'finance.detail.noProof')"
          :can-add="canAddDocuments"
          @add="handleAddFiles"
        />
      </section>
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
          <p v-if="movement.method === 'oil'" class="body-two">{{ $t('finance.detail.oilReturns', { quantity: formatOil(movement.oilLitres ?? 0) }) }}</p>
          <div class="flex flex-wrap justify-end gap-2">
            <button type="button" class="btn-secondary" @click="mode = 'idle'">{{ $t('finance.detail.back') }}</button>
            <button type="button" class="btn-primary bg-danger hover:bg-danger/90" :disabled="!note.trim() || !isOnline || financeStore.isSaving" @click="handleReject">{{ $t('finance.detail.reject') }}</button>
          </div>
        </div>
        <div v-else class="flex flex-col items-center gap-1">
          <movement-link-lots v-if="!isReadOnly && (!movement.lotLinks.length || surplus > 0)" class="w-full" :movement="movement" :is-online="isOnline" />
          <p v-if="!movement.lotLinks.length" class="body-two rounded-card bg-warning-subtle p-4 text-center text-fg-warning">{{ $t('finance.detail.notLinked') }}</p>
          <template v-else>
            <div v-if="surplus > 0" class="flex w-full flex-col gap-2 rounded-card bg-surface p-4 shadow-hairline">
              <p class="label">{{ $t('finance.settle.surplus', { amount: formatMoney(surplus) }) }}</p>
              <div class="grid gap-2 sm:grid-cols-2">
                <button
                  v-for="key in settlementChoices"
                  :key="key"
                  type="button"
                  class="toggle-tile text-start"
                  :class="{ 'toggle-tile-active': surplusSettlement === key }"
                  @click="surplusSettlement = key"
                >
                  {{ $t(`finance.settlements.${key}.label`) }}
                  <span class="block text-xs font-normal opacity-80">{{ $t(`finance.settlements.${key}.hint`) }}</span>
                </button>
              </div>
            </div>
            <button type="button" class="btn-primary min-h-14 w-full text-md" :disabled="!isOnline || financeStore.isSaving || (surplus > 0 && !surplusSettlement)" @click="handleConfirm">{{ $t('finance.detail.confirm', { amount: formatMoney(movement.amount) }) }}</button>
          </template>
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
              v-for="key in settlementChoices"
              :key="key"
              type="button"
              class="toggle-tile text-start"
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

  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useFinanceStore } from 'finance/stores/finance';
import { useSessionStore } from 'global/stores/session';
import { useFinance } from 'finance/composables/use-finance';
import { formatMoney } from 'global/composables/money';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { readDocuments } from 'finance/composables/read-documents';
import { surplusOf } from 'finance/composables/settle';
import { formatOil } from 'lot/composables/quantity';
import type { IMovement, Settlement } from 'finance/types/finance';

import UiField from 'global/components/ui-field.vue';
import DocumentList from 'finance/components/document-list.vue';
import MovementLinkLots from 'finance/components/movement-link-lots.vue';
import ClientTag from 'client/components/client-tag.vue';
import MovementRecap from 'finance/components/movement-recap.vue';
import MovementTicket from 'finance/components/movement-ticket.vue';

// props
const props = defineProps<{ movement: IMovement }>();

// stores
const { t } = useI18n();
const financeStore = useFinanceStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const sessionStore = useSessionStore();
const { isOnline, isReadOnly, canConfirm, canCancel, confirm, reject, cancel } = useFinance();

// variables
const surplusSettlement = ref<Settlement | null>(null);
const mode = ref<'idle' | 'reject' | 'cancel'>('idle');
const note = ref('');
const settlement = ref<Settlement>('credit_note');

// computed
const surplus = computed((): number => surplusOf(props.movement));
const settlementChoices = computed((): Settlement[] => (siteStore.can('refund.manage') ? ['credit_note', 'refund'] : ['credit_note']));
const canAddDocuments = computed((): boolean => !isReadOnly.value && siteStore.can('document.add') && (props.movement.status === 'pending' || props.movement.status === 'confirmed'));

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
  confirm(props.movement, surplus.value > 0 ? (surplusSettlement.value ?? undefined) : undefined);
};

const handleAddFiles = async (files: File[]): Promise<void> => {
  const updated = await financeStore.addDocuments(props.movement, await readDocuments(files, sessionStore.fullName));
  toastStore.push(t(updated ? 'finance.documents.added' : 'finance.toasts.error'), updated ? 'success' : 'danger');
};

const handleReject = (): void => {
  reject(props.movement, note.value);
};

const handleCancel = (): void => {
  cancel(props.movement, note.value, settlement.value);
};
</script>
