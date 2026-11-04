<template>
  <!-- PROTOTYPE: chosen Operator Home (variant A, ticket 0037): two buttons in a row, a search, every Lot still in process with infinite scroll; the column slides out for the confirmation or the new-Client form. -->
  <section ref="root" class="mx-auto flex max-w-xl flex-col gap-5">
    <h1 class="heading-one rise">Bonjour {{ firstName }}</h1>

    <div class="flex min-w-0 gap-4 overflow-hidden">
      <div
        class="flex w-full shrink-0 flex-col gap-5 transition-[margin] duration-500 ease-(--ease-premium)"
        :class="{ '-ml-[calc(100%+1rem)] h-0': isPanelOpen }"
        :inert="isPanelOpen"
      >
        <div class="stagger grid grid-cols-2 gap-3">
          <button
            type="button"
            class="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl bg-action heading-five text-fg-on-action active:scale-[0.98]"
            @click="desk.receive()"
          >
            <add-line-icon class="h-8 w-8" />
            Réceptionner
          </button>
          <button
            type="button"
            class="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-brand
              bg-surface heading-five text-fg-brand active:scale-[0.98]"
            @click="handleOpenPanel({ kind: 'client' })"
          >
            <user-add-line-icon class="h-8 w-8" />
            Nouveau client
          </button>
        </div>

        <label class="relative">
          <search-line-icon class="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-fg-muted" />
          <input v-model="query" class="input pl-12" type="search" placeholder="Chercher un client" />
        </label>

        <div v-if="query && searched.length" class="flex flex-col gap-2">
          <div v-for="client in searched" :key="client.name" class="flex items-center gap-3 rounded-2xl bg-accent-subtle p-3">
            <avatar-tag class="h-14 w-14" :name="client.name" :kind="client.kind" />
            <div class="min-w-0 flex-1">
              <p class="truncate heading-four">{{ client.name }}</p>
              <p v-for="line in desk.accountLines(client)" :key="line" class="body-two text-fg-primary-paragraph">{{ line }}</p>
              <p v-if="!client.lots.length" class="body-two">Aucun lot en cours</p>
            </div>
          </div>
        </div>
        <p v-else-if="query" class="body-two text-center">
          Personne ne s’appelle « {{ query }} ».
          <button type="button" class="link" @click="handleOpenPanel({ kind: 'client' })">Créer ce client</button>
        </p>

        <h2 class="label">{{ query ? 'Lots trouvés' : 'En cours' }} · {{ listed.length }}</h2>
        <ul class="flex flex-col divide-y divide-default border-y border-default">
          <li v-for="lot in visible" :key="lot.id" class="flex items-center gap-3 py-3">
            <avatar-tag class="h-12 w-12" :name="lot.client" :kind="desk.avatarKind(lot.client)" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-fg-display">{{ lot.client }}</p>
              <p class="truncate body-two text-fg-primary-paragraph">{{ desk.stageSentence(lot) }}</p>
              <div class="mt-1.5 flex items-center gap-1">
                <span
                  v-for="(status, index) in LOT_STATUSES"
                  :key="status"
                  class="h-1.5 w-6 rounded-full"
                  :class="index <= LOT_STATUSES.indexOf(lot.status) ? 'bg-action' : 'bg-emphasis'"
                  aria-hidden="true"
                />
                <span class="ml-2 truncate caption">{{ desk.ageLabel(lot) }}</span>
              </div>
            </div>
            <button
              v-if="MOVE_LABELS[lot.status]"
              type="button"
              class="min-h-12 shrink-0 rounded-xl px-3 text-sm font-semibold"
              :class="MOVE_TONES[lot.status]"
              @click="handleMove(lot)"
            >
              {{ MOVE_LABELS[lot.status] }}
            </button>
          </li>
        </ul>
        <div v-if="visible.length < listed.length" :key="shownCount" ref="sentinel" class="skeleton h-14" aria-hidden="true" />
        <p v-else-if="!listed.length" class="body-two py-8 text-center">Aucun lot</p>
      </div>

      <div v-if="panel" class="w-full shrink-0">
        <confirm-move
          v-if="panel.kind === 'move'"
          :lot="panel.lot"
          :kind="desk.avatarKind(panel.lot.client)"
          :next-label="desk.nextLabel(panel.lot)"
          @close="handleClosePanel"
          @confirm="handleConfirm"
        />
        <quick-client-panel v-else close-label="← Retour à la liste" @close="handleClosePanel" @receive="desk.receive" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// PROTOTYPE — chosen Operator Home (variant A, ticket 0037). Mock data only; nothing is saved.
// imports
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { useSessionStore } from 'global/stores/session';
import { LOT_STATUSES, type ILotPrototype } from 'dashboard/prototype/mock-home.prototype';
import { MOVE_LABELS, MOVE_TONES, useOperatorDesk } from 'dashboard/prototype/use-operator-desk.prototype';

import AvatarTag from 'global/components/avatar-tag.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import SearchLineIcon from 'global/icons/search-line.icon.vue';
import UserAddLineIcon from 'global/icons/user-add-line.icon.vue';
import ConfirmMove from 'dashboard/prototype/confirm-move.prototype.vue';
import QuickClientPanel from 'dashboard/prototype/quick-client-panel.prototype.vue';

type Panel = { kind: 'move'; lot: ILotPrototype } | { kind: 'client' };

// stores
const sessionStore = useSessionStore();
const desk = useOperatorDesk();

// variables
const PAGE_SIZE = 12;
const SLIDE_MS = 500;
const query = ref('');
const shownCount = ref(PAGE_SIZE);
const panel = ref<Panel | null>(null);
const isPanelOpen = ref(false);
const root = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
const observer = new IntersectionObserver((entries) => {
  if (entries.some((entry) => entry.isIntersecting)) shownCount.value += PAGE_SIZE;
});
let clearTimer = 0;

// computed
const firstName = computed((): string => sessionStore.session?.firstName ?? '');
const searched = computed(() => desk.searchClients(query.value));
const listed = computed((): ILotPrototype[] => {
  const text = query.value.trim().toLowerCase();
  return text ? desk.activeLots.value.filter((lot) => lot.client.toLowerCase().includes(text)) : desk.activeLots.value;
});
const visible = computed((): ILotPrototype[] => listed.value.slice(0, shownCount.value));

// watchers
watch(query, () => {
  shownCount.value = PAGE_SIZE;
});

watch(sentinel, (element, previous) => {
  if (previous) observer.unobserve(previous);
  if (element) observer.observe(element);
});

// event handlers
const handleOpenPanel = async (next: Panel): Promise<void> => {
  clearTimeout(clearTimer);
  panel.value = next;
  await nextTick();
  isPanelOpen.value = true;
  root.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const handleClosePanel = (): void => {
  isPanelOpen.value = false;
  clearTimer = window.setTimeout(() => {
    panel.value = null;
  }, SLIDE_MS);
};

const handleMove = (lot: ILotPrototype): void => {
  if (desk.needsConfirmation(lot)) handleOpenPanel({ kind: 'move', lot });
  else desk.move(lot);
};

const handleConfirm = (lot: ILotPrototype, oilKg?: number): void => {
  desk.move(lot, oilKg);
  handleClosePanel();
};

// lifecycle
onBeforeUnmount(() => {
  observer.disconnect();
  clearTimeout(clearTimer);
});
</script>
