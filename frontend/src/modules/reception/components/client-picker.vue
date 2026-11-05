<template>
  <div class="flex flex-col gap-3">
    <div v-if="modelValue && !isPicking" class="select-tile-active flex items-center gap-3 rounded-card p-3">
      <ui-avatar :name="modelValue.name" fallback-class="bg-action text-fg-on-action" />
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold text-fg-display">{{ modelValue.name }}</p>
        <p class="body-two truncate">
          {{ formatPhone(modelValue.phone) }} · {{ $t(`reception.clientKinds.${modelValue.kind}`) }}
          <span v-if="modelValue.isPendingSync" class="chip ms-1 bg-info-subtle text-fg-info">{{ $t('reception.clientPicker.new') }}</span>
        </p>
        <p v-if="otherSites.length" class="body-two text-fg-accent">
          {{ $t('reception.clientPicker.otherSites', { sites: otherSites.join(', ') }) }}
        </p>
      </div>
      <button type="button" class="link shrink-0" @click="handleChange">{{ $t('reception.clientPicker.change') }}</button>
    </div>

    <div v-else class="flex gap-2">
      <div class="relative min-w-0 flex-1" @focusout="handleFocusOut">
        <search-line-icon class="pointer-events-none absolute top-1/2 inset-s-4 h-5 w-5 -translate-y-1/2 text-fg-muted" />
        <input
          ref="searchInput"
          v-model="query"
          class="input ps-12"
          type="search"
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          :aria-expanded="isListOpen"
          :aria-controls="listId"
          :aria-activedescendant="isListOpen && results.length ? optionId(activeIndex) : undefined"
          :placeholder="$t('reception.clientPicker.placeholder')"
          @click="isListOpen = true"
          @input="handleInput"
          @keydown="handleKeydown"
        />
        <div v-if="isListOpen" class="absolute inset-x-0 top-full z-30 mt-1 flex max-h-80 flex-col overflow-y-auto rounded-card border border-default bg-surface p-1 shadow-overlay">
          <ul :id="listId" role="listbox" :aria-label="$t('reception.open.client')">
            <li
              v-for="(client, index) in results"
              :id="optionId(index)"
              :key="client.id"
              role="option"
              :aria-selected="index === activeIndex"
              class="option-row flex min-h-14 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5"
              :class="{ 'bg-subtle': index === activeIndex }"
              @mouseenter="activeIndex = index"
              @mousedown.prevent
              @click="handlePick(client)"
            >
              <client-row :client="client" />
            </li>
          </ul>
          <template v-if="query && !results.length">
            <p class="body-two px-2 py-3">{{ $t('reception.clientPicker.noResult', { query }) }}</p>
            <button v-if="canCreate" type="button" class="btn-secondary" @mousedown.prevent @click="handleStartCreate">
              <user-add-line-icon class="h-5 w-5" />
              {{ $t('reception.clientPicker.createNamed', { query }) }}
            </button>
          </template>
        </div>
      </div>
      <button v-if="canCreate" type="button" class="btn-secondary min-h-13 shrink-0 px-4" :aria-label="$t('reception.clientPicker.create')" @click="handleStartCreate">
        <user-add-line-icon class="h-5 w-5" />
        <span class="hidden sm:inline">{{ $t('reception.clientPicker.createShort') }}</span>
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, onMounted, ref, useId, useTemplateRef } from 'vue';

import { useSiteStore } from 'site/stores/site';
import { useClientStore } from 'client/stores/client';
import { formatPhone } from 'global/composables/phone';
import type { IClient } from 'client/types/client';

import ClientRow from 'client/components/client-row.vue';
import UiAvatar from 'global/components/ui-avatar.vue';
import SearchLineIcon from 'global/icons/search-line.icon.vue';
import UserAddLineIcon from 'global/icons/user-add-line.icon.vue';

// props
const props = defineProps<{ modelValue: IClient | null; siteId: string; hideCreate?: boolean }>();

// emits
const emit = defineEmits<{
  (event: 'update:modelValue', client: IClient): void;
  (event: 'create', query: string): void;
}>();

// stores
const siteStore = useSiteStore();
const clientStore = useClientStore();

// variables
const listId = useId();
const searchInput = useTemplateRef<HTMLInputElement>('searchInput');
const query = ref('');
const isPicking = ref(false);
const isListOpen = ref(false);
const activeIndex = ref(0);

// computed
const results = computed((): IClient[] => clientStore.searchClients(query.value));
const canCreate = computed((): boolean => !props.hideCreate && siteStore.can('client.create'));
const otherSites = computed((): string[] =>
  (props.modelValue?.siteIds ?? [])
    .filter((siteId) => siteId !== props.siteId)
    .map((siteId) => siteStore.sites.find((site) => site.id === siteId)?.city ?? '')
    .filter(Boolean),
);

// methods
const optionId = (index: number): string => `${listId}-${index}`;

const pickClient = (client: IClient): void => {
  emit('update:modelValue', client);
  isPicking.value = false;
  isListOpen.value = false;
  query.value = '';
};

const focusSearch = async (): Promise<void> => {
  await nextTick();
  searchInput.value?.focus();
};

// event handlers
const handleChange = (): void => {
  isPicking.value = true;
  activeIndex.value = 0;
  isListOpen.value = true;
  focusSearch();
};

const handleInput = (): void => {
  activeIndex.value = 0;
  isListOpen.value = true;
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    isListOpen.value = false;
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    const active = results.value[activeIndex.value];
    if (isListOpen.value && active) pickClient(active);
    return;
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  const step = event.key === 'ArrowDown' ? 1 : -1;
  const count = results.value.length;
  if (isListOpen.value && count) activeIndex.value = (activeIndex.value + step + count) % count;
  isListOpen.value = true;
};

const handleFocusOut = (event: FocusEvent): void => {
  const target = event.currentTarget as HTMLElement;
  if (!target.contains(event.relatedTarget as Node | null)) isListOpen.value = false;
};

const handlePick = (client: IClient): void => {
  pickClient(client);
};

const handleStartCreate = (): void => {
  isListOpen.value = false;
  emit('create', query.value.trim());
  query.value = '';
};

// lifecycle
onMounted(() => {
  if (!props.modelValue && window.matchMedia('(pointer: fine)').matches) searchInput.value?.focus();
});
</script>
