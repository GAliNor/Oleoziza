<template>
  <section ref="root" class="mx-auto flex max-w-xl flex-col gap-5">
    <h1 class="heading-one rise">{{ $t('dashboard.operator.greeting', { name: firstName }) }}</h1>

    <div class="flex min-w-0 gap-4 overflow-hidden">
      <div
        class="flex w-full shrink-0 flex-col gap-5 transition-[margin] duration-500 ease-(--ease-sheet)"
        :class="{ '-ml-[calc(100%+1rem)] h-0': isPanelOpen }"
        :inert="isPanelOpen"
      >
        <div class="stagger grid grid-cols-2 gap-3">
          <button
            type="button"
            class="press-lift flex h-28 flex-col items-center justify-center gap-2 rounded-control border-2 border-action bg-action heading-five text-fg-on-action"
            @click="desk.receive()"
          >
            <add-line-icon class="h-8 w-8" />
            {{ $t('dashboard.operator.receive') }}
          </button>
          <button
            type="button"
            class="press-lift flex h-28 flex-col items-center justify-center gap-2 rounded-control border-2 border-brand bg-surface heading-five text-fg-brand"
            @click="desk.createClient()"
          >
            <user-add-line-icon class="h-8 w-8" />
            {{ $t('dashboard.operator.newClient') }}
          </button>
        </div>

        <label class="relative">
          <search-line-icon class="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-fg-muted" />
          <input v-model="query" class="input pl-12" type="search" :placeholder="$t('dashboard.operator.search')" />
        </label>

        <div v-if="query && searched.length" class="flex flex-col gap-2">
          <div v-for="client in searched" :key="client.name" class="flex items-center gap-3 rounded-card bg-accent-subtle p-3">
            <ui-avatar class="h-14 w-14" :name="client.name" :variant="client.avatarVariant" />
            <div class="min-w-0 flex-1">
              <p class="truncate heading-four">{{ client.name }}</p>
              <p v-for="line in desk.accountLines(client)" :key="line" class="body-two text-fg-primary-paragraph">{{ line }}</p>
              <p v-if="!client.lots.length" class="body-two">{{ $t('dashboard.operator.noLotInProgress') }}</p>
            </div>
          </div>
        </div>
        <div v-else-if="query" class="flex flex-col items-center gap-3 text-center">
          <p class="body-two">{{ $t('dashboard.operator.noMatch', { query }) }}</p>
          <button type="button" class="btn-secondary min-h-14" @click="desk.createClient(query)">{{ $t('dashboard.operator.createThisClient') }}</button>
        </div>

        <h2 class="label">{{ $t(query ? 'dashboard.operator.found' : 'dashboard.operator.inProgress', { count: listed.length }) }}</h2>
        <ul class="flex flex-col gap-3">
          <li v-for="lot in visible" :key="lot.id" class="card flex flex-col gap-4 p-3">
            <button
              type="button"
              class="press group flex min-h-16 w-full items-center gap-3 rounded-control p-1 text-left hover:bg-subtle
                focus-visible:outline-2 focus-visible:outline-focus"
              :aria-label="$t('dashboard.operator.openLot', { client: lot.clientName, code: lot.code })"
              @click="handleOpenLot(lot)"
            >
              <ui-avatar class="h-12 w-12 shrink-0" :name="lot.clientName" :variant="desk.avatarVariantOf(lot)" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-semibold text-fg-display">{{ lot.clientName }}</span>
                <span class="block body-two text-fg-primary-paragraph">{{ desk.stageSentence(lot) }}</span>
                <span class="mt-1.5 flex items-center gap-1">
                  <span
                    v-for="(status, index) in LOT_STATUSES"
                    :key="status"
                    class="h-1.5 w-4 rounded-full"
                    :class="index <= LOT_STATUSES.indexOf(lot.status) ? 'bg-action' : 'bg-emphasis'"
                    aria-hidden="true"
                  />
                  <span class="ml-2 truncate caption">{{ desk.ageLabel(lot) }}</span>
                </span>
              </span>
              <arrow-right-line-icon class="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-300 ease-(--ease-sheet) group-hover:translate-x-0.5" />
            </button>
            <button type="button" class="press min-h-14 w-full rounded-control px-4 text-md font-semibold" :class="LOT_MOVE_TONES[lot.status]" @click="handleMove(lot)">
              {{ $t(`lot.move.${lot.status}`) }}
            </button>
          </li>
        </ul>
        <div v-if="visible.length < listed.length" :key="shownCount" ref="sentinel" class="skeleton h-14" aria-hidden="true" />
        <ui-empty-state v-else-if="!listed.length" :message="$t('dashboard.operator.noLot')" />
      </div>

      <div v-if="panelLot" class="grid w-full min-w-0 shrink-0 overflow-x-clip">
        <Transition :name="paneTransition">
          <operator-lot-sheet
            v-if="panel?.kind === 'lot'"
            key="lot"
            class="col-start-1 row-start-1"
            :lot="panelLot"
            :account-lines="desk.accountLines(desk.deskClientOf(panelLot))"
            @close="handleClosePanel"
            @move="handleMove"
          />
          <confirm-move
            v-else
            key="move"
            class="col-start-1 row-start-1"
            :lot="panelLot"
            :avatar-variant="desk.avatarVariantOf(panelLot)"
            :next-label="desk.nextLabel(panelLot)"
            :back-label="$t(panel?.isFromSheet ? 'dashboard.operator.backToLot' : 'dashboard.operator.backToList')"
            @close="handleCloseMove"
            @confirm="handleConfirm"
          />
        </Transition>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { useSessionStore } from 'global/stores/session';
import { useClientStore } from 'client/stores/client';
import { useLotStore } from 'lot/stores/lot';
import { useOperatorDesk } from 'dashboard/composables/use-operator-desk';
import { LOT_MOVE_TONES, LOT_STATUSES } from 'lot/constants/lot';
import type { ILot, ILotMove } from 'lot/types/lot';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiAvatar from 'global/components/ui-avatar.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';
import SearchLineIcon from 'global/icons/search-line.icon.vue';
import UserAddLineIcon from 'global/icons/user-add-line.icon.vue';
import ConfirmMove from 'dashboard/components/confirm-move.vue';
import OperatorLotSheet from 'dashboard/components/operator-lot-sheet.vue';

type Panel = { kind: 'lot'; lotId: string } | { kind: 'move'; lotId: string; isFromSheet: boolean };

// stores
const sessionStore = useSessionStore();
const clientStore = useClientStore();
const lotStore = useLotStore();
const desk = useOperatorDesk();

// variables
const PAGE_SIZE = 12;
const SLIDE_MS = 500;
const query = ref('');
const shownCount = ref(PAGE_SIZE);
const panel = ref<Panel | null>(null);
const isPanelOpen = ref(false);
const paneTransition = ref('pane-forward');
const root = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
const observer = new IntersectionObserver((entries) => {
  if (entries.some((entry) => entry.isIntersecting)) shownCount.value += PAGE_SIZE;
});
let clearTimer = 0;

// computed
const firstName = computed((): string => sessionStore.session?.firstName ?? '');
const searched = computed(() => desk.searchClients(query.value));
const listed = computed((): ILot[] => {
  const text = query.value.trim().toLowerCase();
  return text ? desk.activeLots.value.filter((lot) => lot.clientName.toLowerCase().includes(text)) : desk.activeLots.value;
});
const visible = computed((): ILot[] => listed.value.slice(0, shownCount.value));
const panelLot = computed((): ILot | undefined => lotStore.lots.find((lot) => lot.id === panel.value?.lotId));

// watchers
watch(query, () => {
  shownCount.value = PAGE_SIZE;
});

watch(searched, (clients) => clients.forEach((client) => clientStore.fetchAccount(client.id)));

watch(sentinel, (element, previous) => {
  if (previous) observer.unobserve(previous);
  if (element) observer.observe(element);
});

// methods
const openPanel = async (next: Panel): Promise<void> => {
  clearTimeout(clearTimer);
  panel.value = next;
  await nextTick();
  isPanelOpen.value = true;
  root.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const showPane = (next: Panel, transition: 'pane-forward' | 'pane-back'): void => {
  paneTransition.value = transition;
  panel.value = next;
  root.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const closeMove = (): void => {
  const current = panel.value;
  if (current?.kind === 'move' && current.isFromSheet) showPane({ kind: 'lot', lotId: current.lotId }, 'pane-back');
  else handleClosePanel();
};

// event handlers
const handleOpenLot = (lot: ILot): void => {
  clientStore.fetchAccount(lot.clientId);
  openPanel({ kind: 'lot', lotId: lot.id });
};

const handleClosePanel = (): void => {
  isPanelOpen.value = false;
  clearTimer = window.setTimeout(() => {
    panel.value = null;
  }, SLIDE_MS);
};

const handleCloseMove = (): void => {
  closeMove();
};

const handleMove = (lot: ILot): void => {
  if (!desk.needsConfirmation(lot)) {
    desk.openStation(lot);
    return;
  }
  if (panel.value?.kind === 'lot') showPane({ kind: 'move', lotId: lot.id, isFromSheet: true }, 'pane-forward');
  else openPanel({ kind: 'move', lotId: lot.id, isFromSheet: false });
};

const handleConfirm = async (lot: ILot, move: ILotMove): Promise<void> => {
  if (await desk.move(lot, move)) closeMove();
};

// lifecycle
onBeforeUnmount(() => {
  observer.disconnect();
  clearTimeout(clearTimer);
});
</script>
