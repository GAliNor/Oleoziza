<template>
  <div class="flex flex-col gap-4">
    <section class="flex flex-col gap-2">
      <h3 class="label">{{ $t('finance.debts.unpaidLots') }}</h3>
      <ul class="flex flex-col divide-y divide-subtle rounded-control border border-default">
        <li v-for="lot in row.lots" :key="lot.id">
          <button type="button" class="press flex w-full items-center justify-between gap-3 px-3 py-2 text-start hover:bg-subtle" :aria-expanded="openLotId === lot.id" @click="handleToggleLot(lot.id)">
            <span class="min-w-0">
              <span class="block font-medium text-fg-display">{{ lot.code }}</span>
              <span class="body-two block truncate">{{ formatShortDate(lot.receivedAt) }} · {{ lot.variety }} · {{ $t(`lot.status.${lot.status}`) }}</span>
            </span>
            <span class="flex shrink-0 items-center gap-2">
              <span class="figure">{{ formatMoney(amountDue(lot)) }}</span>
              <chevron-down-line-icon class="h-4 w-4 text-fg-muted transition-transform duration-300 ease-(--ease-premium)" :class="{ 'rotate-180': openLotId === lot.id }" />
            </span>
          </button>
          <div v-if="openLotId === lot.id" class="border-t border-subtle p-3">
            <lot-detail :lot="lot" />
          </div>
        </li>
      </ul>
      <quick-payment
        v-if="isPaying && row.clientId"
        :client-id="row.clientId"
        :client-name="row.clientName"
        :site-id="siteId"
        :lot-ids="payableIdsComputed"
        @close="isPaying = false"
        @saved="isPaying = false"
      />
      <button v-else-if="row.clientId && siteStore.can('payment.record')" type="button" class="btn-primary self-start" @click="isPaying = true">
        {{ $t('finance.debts.collect') }}
      </button>
    </section>

    <form v-if="row.clientId" :ref="setFormRoot" class="flex flex-col gap-3 rounded-card bg-subtle p-3" novalidate @submit.prevent="handleSave">
      <h3 class="label">{{ $t('finance.debts.form.title') }}</h3>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button v-for="option in KINDS" :key="option" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': kind === option }" @click="kind = option">
          {{ $t(`finance.debts.kinds.${option}`) }}
        </button>
      </div>
      <ui-field v-slot="{ id, isInvalid, describedBy }" name="note" :label="$t('finance.debts.form.note')" :error="errorOf('note')">
        <textarea :id="id" v-model="note" class="input min-h-20" :aria-invalid="isInvalid" :aria-describedby="describedBy" :placeholder="$t('finance.debts.form.notePlaceholder')" />
      </ui-field>
      <ui-field v-slot="{ id }" :label="$t('finance.debts.form.promisedOn')" :is-optional="!!note.trim()">
        <ui-date-picker :id="id" v-model="promisedOn" :min="todayIso()" :label="$t('finance.debts.form.promisedOn')" is-clearable />
      </ui-field>
      <button type="submit" class="btn-primary self-end" :disabled="financeStore.isSaving">{{ $t('finance.debts.form.save') }}</button>
    </form>

    <section class="flex flex-col gap-2">
      <h3 class="label">{{ $t('finance.debts.log', { count: row.contacts.length }) }}</h3>
      <p v-if="!row.contacts.length" class="body-two">{{ $t('finance.debts.noContactYet') }}</p>
      <ol v-else class="relative flex flex-col gap-3 border-s-2 border-subtle ps-4">
        <li v-for="contact in row.contacts" :key="contact.id" class="flex flex-col gap-0.5">
          <p class="flex flex-wrap items-baseline gap-x-2">
            <span class="font-medium text-fg-display">{{ $t(`finance.debts.kinds.${contact.kind}`) }}</span>
            <span class="body-three">{{ $t('finance.debts.by', { name: contact.by, date: formatDateTime(contact.at) }) }}</span>
          </p>
          <p v-if="contact.note" class="body-two text-fg-primary-paragraph">{{ contact.note }}</p>
          <p v-if="contact.promisedOn" class="body-two" :class="contact.promisedOn < todayIso() ? 'text-fg-danger' : 'text-fg-brand'">{{ $t('finance.debts.promisedLine', { date: formatFullDate(contact.promisedOn) }) }}</p>
        </li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useFinanceStore } from 'finance/stores/finance';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useFormFeedback } from 'global/composables/use-form-feedback';
import { createId } from 'global/composables/crypto';
import { formatDateTime, formatFullDate, formatShortDate, todayIso } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { amountDue, isDiscountPending } from 'lot/composables/fee';
import type { IDebtRow } from 'finance/composables/debt-follow-up';
import type { DebtContactKind } from 'finance/types/finance';

import UiDatePicker from 'global/components/ui-date-picker.vue';
import UiField from 'global/components/ui-field.vue';
import LotDetail from 'lot/components/lot-detail.vue';
import QuickPayment from 'finance/components/quick-payment.vue';
import ChevronDownLineIcon from 'global/icons/chevron-down-line.icon.vue';

// props
/** isPayingAtOpen: opened from « Encaisser » on an À faire task, the payment form shows at once. */
const props = defineProps<{ row: IDebtRow; siteId: string; isPayingAtOpen?: boolean }>();

// stores
const { t } = useI18n();
const financeStore = useFinanceStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();

// variables
const KINDS: DebtContactKind[] = ['call', 'sms', 'visit', 'note'];
const contactId = ref(createId());
const kind = ref<DebtContactKind>('call');
const note = ref('');
const promisedOn = ref('');
const openLotId = ref<string | null>(null);
const isPaying = ref(props.isPayingAtOpen === true);

// computed
const { setFormRoot, errorOf, attempt, reset } = useFormFeedback(() => [{ key: 'note', label: t('finance.debts.form.note'), error: note.value.trim() || promisedOn.value ? null : t('finance.debts.form.missing') }]);
const payableIdsComputed = computed((): string[] => props.row.lots.filter((lot) => !isDiscountPending(lot)).map((lot) => lot.id));

// event handlers
const handleToggleLot = (lotId: string): void => {
  openLotId.value = openLotId.value === lotId ? null : lotId;
};

const save = async (): Promise<void> => {
  const saved = await financeStore.addDebtContact({ id: contactId.value, siteId: props.siteId, clientId: props.row.clientId, kind: kind.value, note: note.value.trim(), promisedOn: promisedOn.value || null });
  if (!saved) {
    toastStore.push(t('finance.debts.form.error'), 'danger');
    return;
  }
  toastStore.push(t('finance.debts.form.saved'), 'success');
  contactId.value = createId();
  note.value = '';
  promisedOn.value = '';
  reset();
};

const handleSave = (): void => attempt(save);
</script>
