<template>
  <!-- PROTOTYPE: one Lot for Management (ticket 0036): figures, « à vérifier » resolution, Lot Timeline, corrections (a side panel or inline per step) and the Audit Trail. -->
  <div class="stagger flex flex-col gap-4">
    <header class="flex flex-wrap items-start gap-3">
      <div class="min-w-0 flex-1">
        <p class="eyebrow">{{ lot.code }} · {{ siteName(lot.siteId) }} · reçu le {{ formatDate(lot.receivedAt) }}</p>
        <h2 class="heading-two">{{ lot.client }}</h2>
        <p class="body-two">{{ lot.variety }} · {{ MODE_LABELS[lot.mode] }} · saisi par {{ lot.operator }}</p>
      </div>
      <span class="chip" :class="LOT_STATUS_CLASSES[lot.status]">{{ STATUS_LABELS[lot.status] }}</span>
      <span v-if="lot.review" class="chip bg-danger-red/10 text-danger-red">À vérifier</span>
    </header>

    <dl class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="card rounded-2xl">
        <dt class="eyebrow text-neutral-500">Olives</dt>
        <dd class="text-2xl font-semibold tabular-nums">{{ lot.netKg.toLocaleString('fr-FR') }} <span class="text-sm text-neutral-500">kg</span></dd>
        <dd class="body-two">{{ (lot.netKg / 100).toLocaleString('fr-FR') }} quintaux</dd>
      </div>
      <div class="card rounded-2xl">
        <dt class="eyebrow text-neutral-500">Huile</dt>
        <dd class="text-2xl font-semibold tabular-nums">{{ lot.oilKg?.toLocaleString('fr-FR') ?? '—' }} <span v-if="lot.oilKg" class="text-sm text-neutral-500">kg</span></dd>
        <dd class="body-two">{{ lot.oilKg ? `${formatLitres(lot.oilKg)} · ${lot.tank ?? 'bidons du Client'}` : 'pas encore pressé' }}</dd>
      </div>
      <div class="card rounded-2xl">
        <dt class="eyebrow text-neutral-500">Rendement</dt>
        <dd class="text-2xl font-semibold tabular-nums" :class="isYieldOdd ? 'text-warning-amber' : 'text-primary-olive-dark'">{{ yieldText }}</dd>
        <dd class="body-two">{{ lot.oilKg ? `${Math.round((lot.oilKg / lot.netKg) * 100)} kg par quintal` : 'attendu 12–24 %' }}</dd>
      </div>
      <div class="card rounded-2xl">
        <dt class="eyebrow text-neutral-500">{{ lot.mode === 'service' ? 'Frais' : 'À payer' }}</dt>
        <dd class="text-2xl font-semibold tabular-nums">{{ formatDh(moneyOf(lot).amount) }}</dd>
        <dd class="body-two truncate">{{ moneyOf(lot).label }}</dd>
      </div>
    </dl>

    <section v-if="lot.review" class="card flex flex-col gap-3 rounded-2xl border-danger-red/30 bg-danger-red/5">
      <template v-if="lot.review.kind === 'conflict'">
        <p class="font-semibold text-neutral-900">Deux postes ont modifié « {{ FIELD_LABELS[lot.review.field] }} » hors ligne</p>
        <p class="body-two">La dernière saisie a été appliquée. Gardez-la ou retenez l’autre.</p>
        <div class="grid gap-2 sm:grid-cols-2">
          <button type="button" class="rounded-xl border-2 border-primary-olive-dark bg-white p-3 text-left disabled:opacity-60" :disabled="!canCorrect" @click="keepApplied(lot)">
            <span class="eyebrow">Appliquée</span>
            <span class="block text-xl font-semibold tabular-nums">{{ lot.review.applied.value }}</span>
            <span class="block text-xs text-neutral-500">{{ lot.review.applied.by }} · {{ formatTime(lot.review.applied.at) }}</span>
            <span class="mt-2 block text-sm font-medium text-primary-olive-dark">Garder cette valeur</span>
          </button>
          <button type="button" class="rounded-xl border border-neutral-300 bg-white p-3 text-left disabled:opacity-60" :disabled="!canCorrect" @click="takeOther(lot)">
            <span class="eyebrow text-neutral-500">Autre saisie</span>
            <span class="block text-xl font-semibold tabular-nums">{{ lot.review.other.value }}</span>
            <span class="block text-xs text-neutral-500">{{ lot.review.other.by }} · {{ formatTime(lot.review.other.at) }}</span>
            <span class="mt-2 block text-sm font-medium text-neutral-700">Retenir celle-ci</span>
          </button>
        </div>
      </template>
      <template v-else>
        <p class="font-semibold text-neutral-900">Saisie faite par {{ lot.review.by }} sans le droit</p>
        <p class="body-two">{{ lot.review.detail }}</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-primary" :disabled="!canCorrect" @click="acceptWrite(lot)">Garder la saisie</button>
          <button type="button" class="btn-secondary text-danger-red" :disabled="!canCorrect" @click="undoWrite(lot)">Annuler l’étape</button>
        </div>
      </template>
    </section>

    <div class="grid gap-4" :class="{ 'lg:grid-cols-[1fr_22rem] lg:items-start': correctionStyle === 'panel' }">
      <section class="card flex flex-col gap-3 rounded-2xl">
        <div class="flex items-center justify-between gap-2">
          <h3 class="label">Parcours du lot</h3>
          <button v-if="lot.corrections.length" type="button" class="link text-sm" @click="reprint(lot)">Réimprimer le ticket</button>
        </div>
        <ol class="relative flex flex-col gap-4 border-l-2 border-primary-olive-light pl-5">
          <li v-for="step in lot.steps" :key="step.key" class="relative">
            <span class="absolute top-1 -left-[27px] h-3 w-3 rounded-full ring-4 ring-white" :class="step.isCorrected ? 'bg-accent-rust' : 'bg-primary-olive-mid'" />
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <p class="font-medium text-neutral-900">
                {{ step.label }}
                <span v-if="step.isCorrected" class="chip ml-1 bg-accent-sand/30 text-accent-brown">corrigé</span>
                <span v-if="step.wasOffline" class="chip ml-1 bg-info-blue/10 text-info-blue">hors ligne</span>
              </p>
              <p class="body-two tabular-nums">{{ formatTime(step.at) }}</p>
            </div>
            <p class="body-two">{{ step.detail }}</p>
            <p class="flex items-center gap-2 text-xs text-neutral-400">
              par {{ step.by }}
              <button
                v-if="correctionStyle === 'inline' && step.field && canCorrect && editingKey !== step.key"
                type="button"
                class="font-medium text-primary-olive-dark hover:underline"
                @click="handleEdit(step.key, step.field)"
              >
                Corriger
              </button>
            </p>
            <form v-if="correctionStyle === 'inline' && editingKey === step.key" class="mt-2 flex flex-col gap-2 rounded-xl bg-neutral-50 p-3" @submit.prevent="handleSubmit">
              <select v-if="step.field === 'client'" v-model="field" class="input">
                <option v-for="key in STEP_FIELDS" :key="key" :value="key">{{ FIELD_LABELS[key] }}</option>
              </select>
              <correction-value v-model="value" :field="field" />
              <input v-model="reason" class="input" placeholder="Motif (obligatoire)" />
              <p v-if="preview" class="body-two">{{ preview }}</p>
              <div class="flex justify-end gap-2">
                <button type="button" class="btn-secondary" @click="editingKey = null">Annuler</button>
                <button type="submit" class="btn-primary" :disabled="!reason.trim() || !value">Corriger</button>
              </div>
            </form>
          </li>
        </ol>
      </section>

      <form v-if="correctionStyle === 'panel' && canCorrect" class="card flex flex-col gap-3 rounded-2xl" @submit.prevent="handleSubmit">
        <h3 class="label">Corriger</h3>
        <p class="body-two">Après le délai de l’Opérateur, seule la Direction corrige. L’ancienne valeur est gardée.</p>
        <select v-model="field" class="input" @change="value = ''">
          <option v-for="key in availableFields" :key="key" :value="key">{{ FIELD_LABELS[key] }} · {{ formatField(lot, key) }}</option>
        </select>
        <correction-value v-model="value" :field="field" />
        <input v-model="reason" class="input" placeholder="Motif (obligatoire)" />
        <p v-if="preview" class="rounded-lg bg-accent-sand/15 p-2 text-sm text-accent-brown">{{ preview }}</p>
        <button type="submit" class="btn-primary" :disabled="!reason.trim() || !value">Enregistrer la correction</button>
      </form>
      <p v-else-if="correctionStyle === 'panel' && isReadOnly" class="card bg-neutral-50 body-two">« Tous les sites » est en lecture seule : choisissez le Site pour corriger.</p>
    </div>

    <section v-if="canSeeAudit" class="card flex flex-col gap-2 rounded-2xl">
      <h3 class="label">Journal d’audit</h3>
      <p v-if="!lot.corrections.length" class="body-two">Aucune correction.</p>
      <ul class="flex flex-col divide-y divide-neutral-100">
        <li v-for="(item, index) in lot.corrections" :key="index" class="flex flex-col gap-0.5 py-2 text-sm">
          <p class="text-neutral-900">
            <span class="font-medium">{{ item.by }}</span>
            <template v-if="item.from !== '—'"> a corrigé {{ FIELD_LABELS[item.field].toLowerCase() }} : <span class="line-through">{{ item.from }}</span> → {{ item.to }}</template>
          </p>
          <p class="body-two">« {{ item.reason }} » · {{ formatDate(item.at) }} {{ formatTime(item.at) }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';

import { STATUS_LABELS, formatDh, formatLitres, type LotStatus } from 'dashboard/prototype/mock-home.prototype';
import { DAILY_PRICE, FIELD_LABELS, MILLING_RATE, MODE_LABELS, formatField, moneyOf, type CorrectableField, type ILotRecordPrototype } from 'lot/prototype/mock-lots.prototype';
import { useLotsPrototype } from 'lot/prototype/use-lots.prototype';

import CorrectionValue from 'lot/prototype/correction-value.prototype.vue';

// props
const props = defineProps<{ lot: ILotRecordPrototype; correctionStyle: 'panel' | 'inline' }>();

// stores
const { isReadOnly, canCorrect, canSeeAudit, correct, keepApplied, takeOther, acceptWrite, undoWrite, reprint, siteName } = useLotsPrototype();

// variables
const LOT_STATUS_CLASSES: Record<LotStatus, string> = {
  received: 'bg-info-blue/10 text-info-blue',
  waiting: 'bg-warning-amber/15 text-warning-amber',
  pressing: 'bg-accent-rust/15 text-accent-rust',
  pressed: 'bg-primary-olive-light text-primary-olive-dark',
  withdrawn: 'bg-neutral-200 text-neutral-600',
};
const STEP_FIELDS: CorrectableField[] = ['client', 'mode', 'variety'];
const field = ref<CorrectableField>('netKg');
const value = ref('');
const reason = ref('');
const editingKey = ref<string | null>(null);

// computed
const availableFields = computed((): CorrectableField[] => (props.lot.oilKg === null ? ['client', 'mode', 'variety', 'netKg'] : ['client', 'mode', 'variety', 'netKg', 'oilKg']));
const yieldRate = computed((): number | null => (props.lot.oilKg ? (props.lot.oilKg / props.lot.netKg) * 100 : null));
const yieldText = computed((): string => (yieldRate.value === null ? '—' : `${yieldRate.value.toFixed(1).replace('.', ',')} %`));
const isYieldOdd = computed((): boolean => yieldRate.value !== null && (yieldRate.value < 12 || yieldRate.value > 24));
const preview = computed((): string => {
  if (!value.value) return '';
  if (field.value === 'mode' && value.value !== props.lot.mode) {
    const amount = value.value === 'purchase' ? props.lot.netKg * DAILY_PRICE : props.lot.netKg * MILLING_RATE;
    return `Devient ${MODE_LABELS[value.value as 'service' | 'purchase'].toLowerCase()} : ${formatDh(amount)} au lieu de ${formatDh(moneyOf(props.lot).amount)}.`;
  }
  if (field.value === 'netKg') {
    const kg = Number(value.value);
    const rate = props.lot.mode === 'service' ? MILLING_RATE : DAILY_PRICE;
    return kg ? `Montant recalculé : ${formatDh(kg * rate)}${props.lot.oilKg ? ` · rendement ${((props.lot.oilKg / kg) * 100).toFixed(1).replace('.', ',')} %` : ''}.` : '';
  }
  if (field.value === 'oilKg') {
    const kg = Number(value.value);
    const rate = (kg / props.lot.netKg) * 100;
    return kg ? `Rendement ${rate.toFixed(1).replace('.', ',')} %${rate < 12 || rate > 24 ? ' : hors de 12–24 %, vérifiez' : ''}.` : '';
  }
  return '';
});

// watchers
watch(
  () => props.lot.id,
  () => {
    editingKey.value = null;
    value.value = '';
    reason.value = '';
  },
);

// methods
const formatDate = (iso: string): string => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const formatTime = (iso: string): string => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// event handlers
const handleEdit = (key: string, stepField: CorrectableField): void => {
  editingKey.value = key;
  field.value = stepField;
  value.value = '';
  reason.value = '';
};

const handleSubmit = (): void => {
  if (!correct(props.lot, field.value, value.value, reason.value)) return;
  editingKey.value = null;
  value.value = '';
  reason.value = '';
};
</script>
