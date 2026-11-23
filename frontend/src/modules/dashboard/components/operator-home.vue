<template>
  <section ref="root" class="mx-auto flex max-w-xl flex-col gap-5">
    <h1 class="heading-one rise">{{ $t('dashboard.operator.greeting', { name: firstName }) }}</h1>

    <div class="flex min-w-0 gap-4 overflow-hidden">
      <div
        class="flex w-full shrink-0 flex-col gap-5 transition-[margin] duration-500 ease-(--ease-sheet)"
        :class="{ '-ms-[calc(100%+1rem)] h-0': isPanelOpen }"
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

        <div class="flex gap-2">
          <label class="relative min-w-0 flex-1">
            <search-line-icon class="pointer-events-none absolute top-1/2 inset-s-4 h-5 w-5 -translate-y-1/2 text-fg-muted" />
            <input
              v-model="query"
              class="input ps-12"
              type="search"
              enterkeyhint="search"
              :placeholder="$t('dashboard.operator.search')"
              :aria-label="$t('dashboard.operator.search')"
              @keydown.enter="handleSearchEnter"
            />
          </label>
          <button type="button" class="press flex min-h-12 shrink-0 items-center gap-2 rounded-control bg-action px-4 font-semibold text-fg-on-action" @click="isScanning = true">
            <qr-scan-line-icon class="h-6 w-6" />
            <span class="max-[380px]:sr-only">{{ $t('dashboard.operator.scan') }}</span>
          </button>
        </div>

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
        <div v-else-if="query && !foundLotsComputed.length" class="flex flex-col items-center gap-3 text-center">
          <p class="body-two">{{ $t('dashboard.operator.noMatch', { query }) }}</p>
          <button type="button" class="btn-secondary min-h-14" @click="desk.createClient(query)">{{ $t('dashboard.operator.createThisClient') }}</button>
        </div>

        <template v-if="query">
          <h2 v-if="foundLotsComputed.length" class="label">{{ $t('dashboard.operator.found', { count: foundLotsComputed.length }) }}</h2>
          <ul class="flex flex-col gap-3">
            <li v-for="lot in foundLotsComputed" :key="lot.id">
              <desk-lot-card :lot="lot" :sentence="desk.stageSentence(lot)" :age="desk.ageLabel(lot)" :avatar-variant="desk.avatarVariantOf(lot)" @open="handleOpenLot" @move="handleMove" />
            </li>
          </ul>
        </template>
        <template v-else>
          <ui-segmented v-model="tab" is-full :options="tabOptionsComputed" :label="$t('dashboard.operator.tabs.label')" />
          <lots-without-line v-if="tab === 'without-line' && desk.siteId.value" :site-id="desk.siteId.value" can-assign @open="handleOpenLot" />
          <div v-else class="stagger flex flex-col gap-3">
            <press-line-card v-for="board in desk.lineBoards.value" :key="board.key" :board="board" @open="handleOpenLot" @move="handleMove" />
          </div>
          <ui-empty-state v-if="tab === 'lines' && !desk.lineBoards.value.length" :message="$t('dashboard.operator.noLot')" />
          <p v-if="tab === 'lines' && desk.pressedCount.value" class="flex items-start gap-2 rounded-card bg-subtle p-3 body-two">
            <drop-line-icon class="mt-0.5 h-4 w-4 shrink-0 text-fg-brand" />
            {{ $t('dashboard.operator.pressedWaiting', desk.pressedCount.value) }}
          </p>
        </template>
      </div>

      <div v-if="panelLot" class="grid w-full min-w-0 shrink-0 overflow-x-clip">
        <Transition :name="paneTransition">
          <operator-lot-sheet
            v-if="panel?.kind === 'lot'"
            key="lot"
            class="col-start-1 row-start-1"
            :lot="panelLot"
            :account-lines="desk.accountLines(desk.deskClientOf(panelLot))"
            :lines="desk.pressLines.value"
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
            :lines="desk.pressLines.value"
            :tanks="desk.tanks.value"
            :back-label="$t(panel?.isFromSheet ? 'dashboard.operator.backToLot' : 'dashboard.operator.backToList')"
            @close="handleCloseMove"
            @confirm="handleConfirm"
          />
        </Transition>
      </div>
    </div>

    <ui-qr-scanner v-if="isScanning" @read="handleScanRead" @close="isScanning = false" />
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { useClientStore } from 'client/stores/client';
import { useLotStore } from 'lot/stores/lot';
import { useOperatorDesk } from 'dashboard/composables/use-operator-desk';
import type { ILot, ILotMove } from 'lot/types/lot';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiAvatar from 'global/components/ui-avatar.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import UiQrScanner from 'global/components/ui-qr-scanner.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import DropLineIcon from 'global/icons/drop-line.icon.vue';
import QrScanLineIcon from 'global/icons/qr-scan-line.icon.vue';
import SearchLineIcon from 'global/icons/search-line.icon.vue';
import UserAddLineIcon from 'global/icons/user-add-line.icon.vue';
import LotsWithoutLine from 'lot/components/lots-without-line.vue';
import ConfirmMove from 'lot/components/confirm-move.vue';
import OperatorLotSheet from 'dashboard/components/operator-lot-sheet.vue';
import DeskLotCard from 'dashboard/components/desk-lot-card.vue';
import PressLineCard from 'dashboard/components/press-line-card.vue';

type DeskTab = 'lines' | 'without-line';
type Panel = { kind: 'lot'; lotId: string } | { kind: 'move'; lotId: string; isFromSheet: boolean };

// stores
const { t } = useI18n();
const sessionStore = useSessionStore();
const toastStore = useToastStore();
const clientStore = useClientStore();
const lotStore = useLotStore();
const desk = useOperatorDesk();

// variables
const SLIDE_MS = 500;
const query = ref('');
const isScanning = ref(false);
const tab = ref<DeskTab>('lines');
const panel = ref<Panel | null>(null);
const isPanelOpen = ref(false);
const paneTransition = ref('pane-forward');
const root = ref<HTMLElement | null>(null);
let clearTimer = 0;

// computed
const firstName = computed((): string => sessionStore.session?.firstName ?? '');
const tabOptionsComputed = computed((): { key: DeskTab; label: string }[] => [
  { key: 'lines', label: t('dashboard.operator.tabs.lines') },
  { key: 'without-line', label: t('dashboard.operator.tabs.withoutLine', { count: desk.withoutLineCount.value }) },
]);
const searched = computed(() => desk.searchClients(query.value));
const foundLotsComputed = computed((): ILot[] => {
  const text = query.value.trim().toLowerCase();
  return desk.activeLots.value.filter((lot) => lot.clientName.toLowerCase().includes(text) || lot.code.toLowerCase().includes(text));
});
const panelLot = computed((): ILot | undefined => lotStore.lots.find((lot) => lot.id === panel.value?.lotId));

// watchers
watch(searched, (clients) => clients.forEach((client) => clientStore.fetchAccount(client.id)));

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

const lotByCode = (code: string): ILot | undefined => {
  const wanted = code.trim().toUpperCase();
  return lotStore.lots.find((lot) => lot.code.toUpperCase() === wanted);
};

// event handlers
const handleScanRead = (text: string): void => {
  isScanning.value = false;
  const lot = lotByCode(text);
  if (lot) {
    query.value = '';
    handleOpenLot(lot);
    return;
  }
  query.value = text;
  toastStore.push(t('dashboard.operator.unknownTicket', { code: text }), 'danger');
};

const handleSearchEnter = (): void => {
  const lot = lotByCode(query.value);
  if (!lot) return;
  query.value = '';
  handleOpenLot(lot);
};

const handleOpenLot = (lot: ILot): void => {
  if (!lotStore.lots.some((item) => item.id === lot.id)) lotStore.upsertLot(lot);
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
  if (panel.value?.kind === 'lot') showPane({ kind: 'move', lotId: lot.id, isFromSheet: true }, 'pane-forward');
  else openPanel({ kind: 'move', lotId: lot.id, isFromSheet: false });
};

const handleConfirm = async (lot: ILot, move: ILotMove): Promise<void> => {
  if (await desk.move(lot, move)) closeMove();
};

// lifecycle
onBeforeUnmount(() => {
  clearTimeout(clearTimer);
});
</script>
