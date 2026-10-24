<template>
  <!-- PROTOTYPE: variant B (ticket 0034): an inbox. A slim strip of tiles, the queue on the left, a review pane on the right with the proof large and « Confirmer et suivant ». -->
  <finance-tiles class="rise" :figures="figures" :period="period" layout="strip" :is-active="list === 'pending'" @pending="handleList('pending')" />

  <div class="rise grid min-w-0 gap-4 lg:grid-cols-[22rem_1fr]">
    <section class="flex min-w-0 flex-col gap-3" :class="{ 'hidden lg:flex': selectedId }">
      <div class="inline-flex self-start rounded-xl bg-neutral-100 p-1">
        <button
          v-for="(label, key) in LISTS"
          :key="key"
          type="button"
          class="min-h-10 rounded-lg px-4 text-sm font-medium transition-colors"
          :class="list === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'"
          @click="handleList(key)"
        >
          {{ label }} <span v-if="key === 'pending'" class="tabular-nums opacity-70">{{ pending.length }}</span>
        </button>
      </div>
      <ul class="stagger flex flex-col gap-2">
        <li v-for="movement in items" :key="movement.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition"
            :class="movement.id === active?.id ? 'border-primary-olive-dark shadow-md' : 'border-neutral-200 hover:border-neutral-300'"
            @click="handleSelect(movement.id)"
          >
            <span class="avatar h-9 w-9 text-base" :class="movement.kind === 'payment' ? 'bg-primary-olive-light text-primary-olive-dark' : 'bg-accent-sand/40 text-accent-brown'">
              {{ movement.kind === 'payment' ? '↓' : '↑' }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-neutral-900">{{ movement.client }}</span>
              <span class="block truncate text-xs text-neutral-500">{{ METHOD_LABELS[movement.method] }} · {{ movement.recordedBy.split(' ')[0] }} · {{ formatWhen(movement.recordedAt) }}</span>
            </span>
            <span class="text-right">
              <span class="block font-semibold tabular-nums" :class="movement.kind === 'payment' ? 'text-primary-olive-dark' : 'text-accent-rust'">{{ formatDh(movement.amount) }}</span>
              <span v-if="list === 'history'" class="chip" :class="STATUS_CLASSES[movement.status]">{{ STATUS_LABELS[movement.status] }}</span>
              <span v-else-if="movement.hasProof" class="text-xs text-neutral-400">photo</span>
            </span>
          </button>
        </li>
      </ul>
      <p v-if="!items.length" class="card body-two text-center">{{ list === 'pending' ? 'Rien à confirmer.' : 'Aucun mouvement sur la période.' }}</p>
    </section>

    <section v-if="active" :key="active.id" class="rise min-w-0 flex-col gap-4" :class="selectedId ? 'flex' : 'hidden lg:flex'">
      <button type="button" class="btn-secondary self-start lg:hidden" @click="handleSelect(null)">← La file</button>

      <template v-if="active.status === 'pending'">
        <div class="card grid gap-5 rounded-2xl p-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
          <div class="flex flex-col gap-3">
            <p class="eyebrow">{{ active.code }} · {{ active.kind === 'payment' ? 'Paiement reçu' : 'Versement payé' }} · {{ position }}</p>
            <h2 class="heading-two">{{ active.client }}</h2>
            <p class="body-two">{{ active.label }}</p>
            <p class="text-4xl font-semibold tracking-tight tabular-nums" :class="active.kind === 'payment' ? 'text-primary-olive-dark' : 'text-accent-rust'">
              {{ active.kind === 'payment' ? '+' : '−' }}{{ formatDh(active.amount) }}
            </p>
            <img v-if="active.hasProof" :src="proofImage(active)" alt="Justificatif" class="w-full max-w-xl rounded-xl ring-1 ring-neutral-200" />
            <p v-else class="rounded-xl bg-neutral-50 p-4 body-two">
              Pas de photo. {{ active.method === 'cash' ? 'Espèces : vérifiez le montant dans la caisse de ' + active.recordedBy.split(' ')[0] + '.' : 'Part d’huile : ' + active.oilKg + ' kg passent du stock du Client à celui de l’huilerie.' }}
            </p>
          </div>
          <dl class="flex flex-col gap-3 text-sm">
            <div><dt class="label">Mode</dt><dd>{{ METHOD_LABELS[active.method] }}</dd></div>
            <div v-if="active.reference"><dt class="label">Référence</dt><dd>{{ active.reference }}</dd></div>
            <div><dt class="label">Saisi par</dt><dd>{{ active.recordedBy }}<br />{{ formatWhen(active.recordedAt) }}</dd></div>
            <div v-if="active.wasOffline"><dd class="chip bg-info-blue/10 text-info-blue">saisi hors ligne</dd></div>
            <div v-if="active.feeOffset"><dt class="label">Frais déduits</dt><dd>{{ formatDh(active.feeOffset) }} (brut {{ formatDh(active.amount + active.feeOffset) }})</dd></div>
            <div><dt class="label">Site</dt><dd>{{ siteName(active.siteId) }}</dd></div>
          </dl>
        </div>

        <p v-if="isReadOnly" class="card bg-neutral-50 body-two">« Tous les sites » est en lecture seule : choisissez le Site pour confirmer.</p>
        <div v-else-if="canConfirm" class="card sticky bottom-20 flex flex-col gap-3 rounded-2xl shadow-lg md:bottom-4">
          <div v-if="isRejecting" class="flex flex-col gap-2">
            <textarea v-model="note" class="input min-h-16" placeholder="Motif du rejet" />
            <div class="flex justify-end gap-2">
              <button type="button" class="btn-secondary" @click="isRejecting = false">Retour</button>
              <button type="button" class="btn-primary bg-danger-red hover:bg-danger-red/90" :disabled="!note.trim() || !isOnline" @click="handleReject">Rejeter et suivant</button>
            </div>
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <button type="button" class="btn-primary flex-1" :disabled="!isOnline" @click="handleConfirm">Confirmer et suivant</button>
            <button type="button" class="btn-secondary text-danger-red" @click="isRejecting = true">Rejeter…</button>
          </div>
          <p v-if="!isOnline" class="body-two text-warning-amber">Hors ligne : la confirmation revient avec le réseau.</p>
        </div>
      </template>

      <movement-detail v-else :movement="active" />
    </section>

    <section v-else class="card hidden flex-col items-center justify-center gap-2 rounded-2xl py-16 text-center lg:flex">
      <p class="text-4xl">✓</p>
      <p class="heading-two">Tout est confirmé</p>
      <p class="body-two">Les nouveaux paiements saisis au comptoir arriveront ici.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { formatDh } from 'dashboard/prototype/mock-home.prototype';
import { METHOD_LABELS, STATUS_CLASSES, STATUS_LABELS, formatWhen, proofImage, type IMovementPrototype } from 'finance/prototype/mock-finance.prototype';
import { useFinancePrototype } from 'finance/prototype/use-finance.prototype';

import FinanceTiles from 'finance/prototype/finance-tiles.prototype.vue';
import MovementDetail from 'finance/prototype/movement-detail.prototype.vue';

// stores
const route = useRoute();
const router = useRouter();
const { inPeriod, pending, figures, period, isOnline, isReadOnly, canConfirm, siteName, confirm, reject, find } = useFinancePrototype();

// variables
const LISTS = { pending: 'À traiter', history: 'Historique' } as const;
const isRejecting = ref(false);
const note = ref('');

// computed
const list = computed((): keyof typeof LISTS => (route.query.tab === 'history' ? 'history' : 'pending'));
const items = computed((): IMovementPrototype[] => (list.value === 'pending' ? pending.value : inPeriod.value));
const selectedId = computed((): string | null => (typeof route.query.movement === 'string' && find(route.query.movement) ? route.query.movement : null));
const active = computed((): IMovementPrototype | undefined => find(selectedId.value) ?? (list.value === 'pending' ? pending.value[0] : undefined));
const position = computed((): string => {
  const index = pending.value.findIndex((movement) => movement.id === active.value?.id);
  return index === -1 ? '' : `${index + 1} sur ${pending.value.length}`;
});

// watchers
watch(
  () => active.value?.id,
  () => {
    isRejecting.value = false;
    note.value = '';
  },
);

// methods
const goNext = (): void => {
  router.replace({ query: { ...route.query, movement: pending.value[0]?.id } });
};

// event handlers
const handleList = (key: keyof typeof LISTS): void => {
  router.replace({ query: { ...route.query, tab: key === 'pending' ? undefined : key, movement: undefined } });
};

const handleSelect = (id: string | null): void => {
  router.replace({ query: { ...route.query, movement: id ?? undefined } });
};

const handleConfirm = (): void => {
  if (active.value && confirm(active.value)) goNext();
};

const handleReject = (): void => {
  if (active.value && reject(active.value, note.value)) goNext();
};
</script>
