<template>
  <!-- PROTOTYPE: one Payment or Payout (ticket 0034): amount, method, Payment Proof, who recorded it, and confirm / reject / cancel. -->
  <div class="stagger flex flex-col gap-4">
    <header class="flex flex-wrap items-start gap-3">
      <span class="avatar h-12 w-12" :class="movement.kind === 'payment' ? 'bg-primary-olive-light text-primary-olive-dark' : 'bg-accent-sand/40 text-accent-brown'">
        {{ movement.kind === 'payment' ? '↓' : '↑' }}
      </span>
      <div class="min-w-0 flex-1">
        <p class="eyebrow">{{ movement.code }} · {{ movement.kind === 'payment' ? 'Paiement reçu' : 'Versement payé' }} · {{ PURPOSE_LABELS[movement.purpose] }}</p>
        <h2 class="heading-two truncate">{{ movement.client }}</h2>
        <p class="body-two">{{ movement.label }}</p>
      </div>
      <div class="text-right">
        <p class="text-3xl font-semibold tracking-tight tabular-nums" :class="movement.kind === 'payment' ? 'text-primary-olive-dark' : 'text-accent-rust'">
          {{ movement.kind === 'payment' ? '+' : '−' }}{{ formatDh(movement.amount) }}
        </p>
        <span class="chip" :class="STATUS_CLASSES[movement.status]">{{ STATUS_LABELS[movement.status] }}</span>
      </div>
    </header>

    <div class="grid gap-4 md:grid-cols-[1fr_minmax(0,18rem)]">
      <dl class="card grid content-start gap-3 rounded-2xl sm:grid-cols-2">
        <div>
          <dt class="label">Mode</dt>
          <dd class="text-neutral-900">{{ METHOD_LABELS[movement.method] }}<span v-if="movement.oilKg"> · {{ movement.oilKg }} kg d’huile</span></dd>
        </div>
        <div v-if="movement.reference">
          <dt class="label">Référence</dt>
          <dd class="text-neutral-900">{{ movement.reference }}</dd>
        </div>
        <div>
          <dt class="label">Saisi par</dt>
          <dd class="text-neutral-900">
            {{ movement.recordedBy }} · {{ formatWhen(movement.recordedAt) }}
            <span v-if="movement.wasOffline" class="chip ml-1 bg-info-blue/10 text-info-blue">saisi hors ligne</span>
          </dd>
        </div>
        <div>
          <dt class="label">Site</dt>
          <dd class="text-neutral-900">{{ siteName(movement.siteId) }}</dd>
        </div>
        <div v-if="movement.feeOffset" class="sm:col-span-2">
          <dt class="label">Compensation (frais déduits)</dt>
          <dd class="text-neutral-900 tabular-nums">
            {{ formatDh(movement.amount + movement.feeOffset) }} − {{ formatDh(movement.feeOffset) }} de frais = {{ formatDh(movement.amount) }} versés
          </dd>
        </div>
        <div v-if="movement.decidedBy" class="sm:col-span-2">
          <dt class="label">{{ STATUS_LABELS[movement.status] }} par</dt>
          <dd class="text-neutral-900">
            {{ movement.decidedBy }} · {{ formatWhen(movement.decidedAt!) }}
            <span v-if="movement.settlement" class="chip ml-1 bg-neutral-100 text-neutral-700">{{ SETTLEMENT_LABELS[movement.settlement] }}</span>
          </dd>
          <dd v-if="movement.note" class="body-two mt-1">« {{ movement.note }} »</dd>
        </div>
      </dl>

      <figure class="card flex flex-col gap-2 rounded-2xl">
        <figcaption class="label">Justificatif</figcaption>
        <button v-if="movement.hasProof" type="button" class="overflow-hidden rounded-xl ring-1 ring-neutral-200 transition hover:ring-primary-olive" @click="isProofOpen = true">
          <img :src="proofImage(movement)" alt="Justificatif du paiement" class="w-full" />
        </button>
        <p v-else class="body-two">Aucune photo jointe{{ movement.method === 'cash' ? ' (espèces)' : '' }}.</p>
      </figure>
    </div>

    <p v-if="isReadOnly" class="card bg-neutral-50 body-two">« Tous les sites » est en lecture seule : choisissez le Site pour confirmer ou annuler.</p>
    <p v-else-if="!isOnline && (movement.status === 'pending' || movement.status === 'confirmed')" class="card border-warning-amber/40 bg-warning-amber/10 body-two">
      Hors ligne : la confirmation et l’annulation reviennent avec le réseau.
    </p>

    <div v-if="movement.status === 'pending' && canConfirm" class="card flex flex-col gap-3 rounded-2xl">
      <template v-if="mode === 'reject'">
        <label class="label" for="reject-note">Motif du rejet</label>
        <textarea id="reject-note" v-model="note" class="input min-h-20" placeholder="Ex. montant absent de la caisse" />
        <p v-if="movement.method === 'oil'" class="body-two">Les {{ movement.oilKg }} kg d’huile reviennent au stock du Client.</p>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="btn-secondary" @click="mode = 'idle'">Retour</button>
          <button type="button" class="btn-primary bg-danger-red hover:bg-danger-red/90" :disabled="!note.trim() || !isOnline" @click="handleReject">Rejeter</button>
        </div>
      </template>
      <div v-else class="flex flex-wrap gap-2">
        <button type="button" class="btn-primary flex-1" :disabled="!isOnline" @click="handleConfirm">Confirmer {{ formatDh(movement.amount) }}</button>
        <button type="button" class="btn-secondary text-danger-red" @click="mode = 'reject'">Rejeter…</button>
      </div>
    </div>

    <div v-else-if="movement.status === 'confirmed' && movement.kind === 'payment' && canCancel" class="card flex flex-col gap-3 rounded-2xl">
      <template v-if="mode === 'cancel'">
        <label class="label" for="cancel-note">Motif de l’annulation</label>
        <textarea id="cancel-note" v-model="note" class="input min-h-20" placeholder="Ex. chèque revenu impayé" />
        <div class="grid gap-2 sm:grid-cols-2">
          <button
            v-for="(label, key) in SETTLEMENT_LABELS"
            :key="key"
            type="button"
            class="toggle-tile text-left"
            :class="{ 'toggle-tile-active': settlement === key }"
            @click="settlement = key"
          >
            {{ label }}
            <span class="block text-xs font-normal opacity-80">{{ key === 'credit_note' ? 'à déduire d’un prochain paiement' : 'l’argent est rendu au Client' }}</span>
          </button>
        </div>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="btn-secondary" @click="mode = 'idle'">Retour</button>
          <button type="button" class="btn-primary bg-danger-red hover:bg-danger-red/90" :disabled="!note.trim() || !isOnline" @click="handleCancel">Annuler le paiement</button>
        </div>
      </template>
      <button v-else type="button" class="btn-secondary self-start text-danger-red" @click="mode = 'cancel'">Annuler ce paiement…</button>
    </div>

    <div v-if="isProofOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm" @click.self="isProofOpen = false">
      <img :src="proofImage(movement)" alt="Justificatif du paiement" class="max-h-[85dvh] w-full max-w-2xl rounded-2xl bg-white" />
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { ref, watch } from 'vue';

import { formatDh } from 'dashboard/prototype/mock-home.prototype';
import {
  METHOD_LABELS,
  PURPOSE_LABELS,
  SETTLEMENT_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  formatWhen,
  proofImage,
  type IMovementPrototype,
  type Settlement,
} from 'finance/prototype/mock-finance.prototype';
import { useFinancePrototype } from 'finance/prototype/use-finance.prototype';

// props
const props = defineProps<{ movement: IMovementPrototype }>();

// emits
const emit = defineEmits<{ (event: 'decided'): void }>();

// stores
const { isOnline, isReadOnly, canConfirm, canCancel, siteName, confirm, reject, cancel } = useFinancePrototype();

// variables
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
  if (confirm(props.movement)) emit('decided');
};

const handleReject = (): void => {
  if (reject(props.movement, note.value)) emit('decided');
};

const handleCancel = (): void => {
  if (cancel(props.movement, note.value, settlement.value)) emit('decided');
};
</script>
