<template>
  <section class="flex flex-col gap-3">
    <h4 class="label">{{ $t('finance.lotPayments.title') }}</h4>
    <p v-if="!paymentsComputed.length" class="body-two">{{ $t('finance.lotPayments.none') }}</p>
    <ul v-else class="flex flex-col gap-3">
      <li v-for="payment in paymentsComputed" :key="payment.id" class="flex flex-col gap-3 rounded-card border border-default p-4">
        <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <span class="min-w-0">
            <span class="block font-medium text-fg-display tabular-nums">{{ payment.code }} · {{ formatMoney(linkedAmount(payment)) }}</span>
            <span class="body-two block">{{ $t(`finance.methods.${payment.method}`) }} · {{ payment.recordedBy }} · {{ formatShortDate(payment.recordedAt) }}</span>
          </span>
          <span class="chip shrink-0" :class="MOVEMENT_STATUS_TONES[payment.status]">{{ $t(`finance.statuses.${payment.status}`) }}</span>
        </div>
        <document-list
          :documents="payment.documents"
          :empty-message="$t('finance.lotPayments.noProof')"
          :can-add="canAddProof(payment)"
          :add-label="$t('finance.lotPayments.addProof')"
          @add="handleAddFiles(payment, $event)"
        />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useFinanceStore } from 'finance/stores/finance';
import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { readFiles } from 'global/composables/read-files';
import { formatMoney } from 'global/composables/money';
import { formatShortDate } from 'global/composables/date';
import { MOVEMENT_STATUS_TONES } from 'finance/constants/finance';
import type { IMovement } from 'finance/types/finance';
import type { ILot } from 'lot/types/lot';

import DocumentList from 'finance/components/document-list.vue';

// props
const props = defineProps<{ lot: ILot }>();

// stores
const { t } = useI18n();
const financeStore = useFinanceStore();
const sessionStore = useSessionStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();

// computed
const paymentsComputed = computed((): IMovement[] => financeStore.movements.filter((movement) => movement.lotLinks.some((link) => link.lotId === props.lot.id)));

// methods
const linkedAmount = (payment: IMovement): number => payment.lotLinks.filter((link) => link.lotId === props.lot.id).reduce((sum, link) => sum + link.amount, 0);

const canAddProof = (payment: IMovement): boolean => siteStore.hasPermission('document.add', props.lot.siteId) && (payment.status === 'pending' || payment.status === 'confirmed');

// event handlers
const handleAddFiles = async (payment: IMovement, files: File[]): Promise<void> => {
  const documents = await readFiles(files, sessionStore.fullName);
  if (!documents.length) return;
  const updated = await financeStore.addDocuments(payment, documents);
  toastStore.push(t(updated ? 'finance.documents.added' : 'finance.toasts.error'), updated ? 'success' : 'danger');
};
</script>
