<template>
  <div class="flex flex-col gap-5">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <kpi-tile label="Résultat net (saison)" :value="dhNumber(SEASON.netResult * scale)" unit="DH" :delta="formatDelta(SEASON.netResult, SEASON.previousNetResult)" is-delta-good />
      <kpi-tile label="Chiffre d’affaires" :value="dhNumber(revenue)" unit="DH" sub="trituration, huile, sous-produits" />
      <kpi-tile label="À encaisser" :value="dhNumber(ALERTS.amountToCollect * scale)" unit="DH" :sub="`${atRiskCount} clients à relancer`" />
      <kpi-tile label="À confirmer" :value="dhNumber(totalToConfirm)" unit="DH" :sub="`${payments.length} paiements`" />
    </div>

    <div class="grid gap-3 lg:grid-cols-5">
      <div class="card flex flex-col gap-3 rounded-2xl p-5 lg:col-span-2">
        <h2 class="heading-two">Résultat de la saison</h2>
        <dl class="flex flex-col divide-y divide-neutral-100 text-sm">
          <div v-for="line in SEASON.breakdown" :key="line.label" class="flex justify-between py-2">
            <dt class="text-neutral-600">{{ line.label }}</dt>
            <dd class="font-medium tabular-nums" :class="line.amount < 0 ? 'text-danger-red' : 'text-neutral-900'">{{ line.amount > 0 ? '+' : '' }}{{ formatDh(line.amount * scale) }}</dd>
          </div>
          <div class="flex justify-between py-2 font-semibold">
            <dt>Résultat net</dt>
            <dd class="text-primary-olive-dark tabular-nums">{{ formatDh(SEASON.netResult * scale) }}</dd>
          </div>
        </dl>
      </div>
      <div class="card flex flex-col gap-4 rounded-2xl p-5 lg:col-span-3">
        <div class="flex items-baseline justify-between">
          <h2 class="heading-two">Chiffre d’affaires par semaine</h2>
          <p class="body-two">DH</p>
        </div>
        <div class="flex h-44 items-end gap-3">
          <div v-for="(week, index) in WEEKLY_REVENUE" :key="week.week" class="group relative flex h-full flex-1 flex-col justify-end">
            <p class="mb-1 text-center text-xs font-medium text-neutral-700 tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
              {{ formatDh(week.amount * scale) }}
            </p>
            <div
              class="rounded-t-[4px]"
              :class="index === WEEKLY_REVENUE.length - 1 ? 'bg-primary-olive-dark' : 'bg-primary-olive-light'"
              :style="{ height: `${(week.amount / maxWeek) * 85}%` }"
            />
          </div>
        </div>
        <div class="flex gap-3 border-t border-neutral-200 pt-2">
          <p v-for="week in WEEKLY_REVENUE" :key="week.week" class="flex-1 text-center text-xs text-neutral-500">{{ week.week }}</p>
        </div>
      </div>
    </div>

    <div class="card overflow-x-auto rounded-2xl p-0">
      <div class="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 class="heading-two">Paiements à confirmer</h2>
        <p class="body-two">{{ payments.length }} en attente</p>
      </div>
      <table class="w-full min-w-[640px] text-sm">
        <thead class="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase">
          <tr>
            <th class="px-4 py-3 font-semibold">Client</th>
            <th class="px-4 py-3 font-semibold">Mode</th>
            <th class="px-4 py-3 text-right font-semibold">Montant</th>
            <th class="px-4 py-3 font-semibold">Saisi</th>
            <th class="px-4 py-3 font-semibold">Justificatif</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="payment in payments" :key="payment.client + payment.at" class="border-t border-neutral-100">
            <td class="px-4 py-3 font-medium text-neutral-900">{{ payment.client }}</td>
            <td class="px-4 py-3 text-neutral-700">{{ payment.method }}</td>
            <td class="px-4 py-3 text-right font-medium tabular-nums">{{ formatDh(payment.amount) }}</td>
            <td class="px-4 py-3 text-neutral-500">{{ payment.at }} · {{ payment.by }}</td>
            <td class="px-4 py-3">
              <span v-if="payment.hasProof" class="chip bg-info-blue/10 text-info-blue">Image jointe</span>
              <span v-else class="body-two">—</span>
            </td>
            <td class="px-4 py-3 text-right">
              <button type="button" class="rounded-lg bg-primary-olive-light px-3 py-1.5 text-sm font-medium text-primary-olive-dark hover:bg-primary-olive-mid/40" @click="handleConfirm(payment)">
                Confirmer
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!payments.length" class="body-two px-5 py-8 text-center">Tous les paiements sont confirmés.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — Management Home "Finances" tab (ticket 0019 follow-up); shown only with finance.view.
// imports
import { computed, ref } from 'vue';

import { useToastStore } from 'global/stores/toast';
import {
  ALERTS,
  CLIENTS,
  formatDelta,
  formatDh,
  PAYMENTS_TO_CONFIRM,
  SEASON,
  WEEKLY_REVENUE,
  type IPaymentPrototype,
} from 'dashboard/prototype/mock-home.prototype';

import KpiTile from 'dashboard/prototype/kpi-tile.prototype.vue';

// props
const props = defineProps<{ scale: number }>();

// stores
const toastStore = useToastStore();

// variables
const payments = ref<IPaymentPrototype[]>([...PAYMENTS_TO_CONFIRM]);
const maxWeek = Math.max(...WEEKLY_REVENUE.map((week) => week.amount));

// computed
const revenue = computed((): number =>
  SEASON.breakdown.filter((line) => line.amount > 0).reduce((sum, line) => sum + line.amount, 0) * props.scale,
);
const totalToConfirm = computed((): number => payments.value.reduce((sum, payment) => sum + payment.amount, 0));
const atRiskCount = computed((): number => CLIENTS.filter((client) => client.state === 'at-risk').length);

// methods
const dhNumber = (value: number): string => Math.round(value).toLocaleString('fr-FR');

// event handlers
const handleConfirm = (payment: IPaymentPrototype): void => {
  payments.value = payments.value.filter((item) => item !== payment);
  toastStore.push(`Paiement de ${payment.client} confirmé (${formatDh(payment.amount)})`, 'success');
};
</script>
