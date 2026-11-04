<template>
  <section ref="root" class="mx-auto flex max-w-xl flex-col gap-5">
    <h1 class="heading-one rise">{{ $t('dashboard.operator.greeting', { name: firstName }) }}</h1>

    <div class="flex min-w-0 gap-4 overflow-hidden">
      <div
        class="flex w-full shrink-0 flex-col gap-5 transition-[margin] duration-500 ease-(--ease-premium)"
        :class="{ '-ml-[calc(100%+1rem)] h-0': isPanelOpen }"
        :inert="isPanelOpen"
      >
        <div class="stagger grid grid-cols-2 gap-3">
          <button
            type="button"
            class="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-card bg-action heading-five text-fg-on-action active:scale-[0.98]"
            @click="desk.receive()"
          >
            <add-line-icon class="h-8 w-8" />
            {{ $t('dashboard.operator.receive') }}
          </button>
          <button
            type="button"
            class="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-card border-2 border-brand
              bg-surface heading-five text-fg-brand active:scale-[0.98]"
            @click="handleOpenPanel({ kind: 'client' })"
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
        <p v-else-if="query" class="body-two text-center">
          {{ $t('dashboard.operator.noMatch', { query }) }}
          <button type="button" class="link" @click="handleOpenPanel({ kind: 'client' })">{{ $t('dashboard.operator.createThisClient') }}</button>
        </p>

        <h2 class="label">{{ $t(query ? 'dashboard.operator.found' : 'dashboard.operator.inProgress', { count: listed.length }) }}</h2>
        <ul class="flex flex-col divide-y divide-default border-y border-default">
          <li v-for="lot in visible" :key="lot.id" class="flex items-center gap-3 py-3">
            <ui-avatar class="h-12 w-12" :name="lot.clientName" :variant="desk.avatarVariantOf(lot)" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-fg-display">{{ lot.clientName }}</p>
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
              v-if="lot.status !== 'withdrawn'"
              type="button"
              class="min-h-12 shrink-0 rounded-xl px-3 text-sm font-semibold"
              :class="LOT_MOVE_TONES[lot.status]"
              @click="handleMove(lot)"
            >
              {{ $t(`lot.move.${lot.status}`) }}
            </button>
          </li>
        </ul>
        <div v-if="visible.length < listed.length" :key="shownCount" ref="sentinel" class="skeleton h-14" aria-hidden="true" />
        <ui-empty-state v-else-if="!listed.length" :message="$t('dashboard.operator.noLot')" />
      </div>

      <div v-if="panel" class="w-full shrink-0">
        <confirm-move
          v-if="panel.kind === 'move'"
          :lot="panel.lot"
          :avatar-variant="desk.avatarVariantOf(panel.lot)"
          :next-label="desk.nextLabel(panel.lot)"
          @close="handleClosePanel"
          @confirm="handleConfirm"
        />
        <quick-client-panel v-else :close-label="$t('dashboard.operator.backToList')" @close="handleClosePanel" @receive="desk.receive" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { useSessionStore } from 'global/stores/session';
import { useClientStore } from 'client/stores/client';
import { useOperatorDesk } from 'dashboard/composables/use-operator-desk';
import { LOT_MOVE_TONES, LOT_STATUSES } from 'lot/constants/lot';
import type { ILot, ILotMove } from 'lot/types/lot';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiAvatar from 'global/components/ui-avatar.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import SearchLineIcon from 'global/icons/search-line.icon.vue';
import UserAddLineIcon from 'global/icons/user-add-line.icon.vue';
import ConfirmMove from 'dashboard/components/confirm-move.vue';
import QuickClientPanel from 'dashboard/components/quick-client-panel.vue';

type Panel = { kind: 'move'; lot: ILot } | { kind: 'client' };

// stores
const sessionStore = useSessionStore();
const clientStore = useClientStore();
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
const listed = computed((): ILot[] => {
  const text = query.value.trim().toLowerCase();
  return text ? desk.activeLots.value.filter((lot) => lot.clientName.toLowerCase().includes(text)) : desk.activeLots.value;
});
const visible = computed((): ILot[] => listed.value.slice(0, shownCount.value));

// watchers
watch(query, () => {
  shownCount.value = PAGE_SIZE;
});

watch(searched, (clients) => clients.forEach((client) => clientStore.fetchAccount(client.id)));

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

const handleMove = (lot: ILot): void => {
  if (desk.needsConfirmation(lot)) handleOpenPanel({ kind: 'move', lot });
  else desk.openStation(lot);
};

const handleConfirm = async (lot: ILot, move: ILotMove): Promise<void> => {
  if (await desk.move(lot, move)) handleClosePanel();
};

// lifecycle
onBeforeUnmount(() => {
  observer.disconnect();
  clearTimeout(clearTimer);
});
</script>
