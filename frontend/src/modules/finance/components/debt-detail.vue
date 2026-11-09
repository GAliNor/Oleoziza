<template>
  <div class="flex flex-col gap-4">
    <section class="flex flex-col gap-2">
      <h3 class="label">{{ $t('finance.debts.unpaidLots') }}</h3>
      <ul class="flex flex-col divide-y divide-subtle rounded-control border border-default">
        <li v-for="lot in row.lots" :key="lot.id" class="flex items-center justify-between gap-3 px-3 py-2">
          <span class="min-w-0">
            <span class="block font-medium text-fg-display">{{ lot.code }}</span>
            <span class="body-two block truncate">{{ formatShortDate(lot.receivedAt) }} · {{ lot.variety }} · {{ $t(`lot.status.${lot.status}`) }}</span>
          </span>
          <span class="shrink-0 figure">{{ formatMoney(amountDue(lot)) }}</span>
        </li>
      </ul>
      <router-link v-if="row.clientId && siteStore.can('payment.record')" :to="{ name: 'client-page', params: { id: row.clientId }, query: { action: 'payment' } }" class="btn-primary self-start">
        {{ $t('finance.debts.collect') }}
      </router-link>
    </section>

    <form v-if="row.clientId" class="flex flex-col gap-3 rounded-card bg-subtle p-3" @submit.prevent="handleSave">
      <h3 class="label">{{ $t('finance.debts.form.title') }}</h3>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button v-for="option in KINDS" :key="option" type="button" class="toggle-tile" :class="{ 'toggle-tile-active': kind === option }" @click="kind = option">
          {{ $t(`finance.debts.kinds.${option}`) }}
        </button>
      </div>
      <ui-field v-slot="{ id }" :label="$t('finance.debts.form.note')">
        <textarea :id="id" v-model="note" class="input min-h-20" :placeholder="$t('finance.debts.form.notePlaceholder')" />
      </ui-field>
      <ui-field v-slot="{ id }" :label="$t('finance.debts.form.promisedOn')">
        <input :id="id" v-model="promisedOn" class="input" type="date" :min="todayIso()" />
      </ui-field>
      <button type="submit" class="btn-primary self-end" :disabled="!canSave">{{ $t('finance.debts.form.save') }}</button>
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
import { createId } from 'global/composables/crypto';
import { formatDateTime, formatFullDate, formatShortDate, todayIso } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { amountDue } from 'lot/composables/fee';
import type { IDebtRow } from 'finance/composables/debt-follow-up';
import type { DebtContactKind } from 'finance/types/finance';

import UiField from 'global/components/ui-field.vue';

// props
const props = defineProps<{ row: IDebtRow; siteId: string }>();

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

// computed
const canSave = computed((): boolean => (!!note.value.trim() || !!promisedOn.value) && !financeStore.isSaving);

// event handlers
const handleSave = async (): Promise<void> => {
  if (!canSave.value) return;
  const saved = await financeStore.addDebtContact({ id: contactId.value, siteId: props.siteId, clientId: props.row.clientId, kind: kind.value, note: note.value.trim(), promisedOn: promisedOn.value || null });
  if (!saved) {
    toastStore.push(t('finance.debts.form.error'), 'danger');
    return;
  }
  toastStore.push(t('finance.debts.form.saved'), 'success');
  contactId.value = createId();
  note.value = '';
  promisedOn.value = '';
};
</script>
