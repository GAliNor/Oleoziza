<template>
  <div ref="root" class="relative min-w-0" @focusout="handleFocusOut" @keydown.esc.stop="handleEscape">
    <div class="relative">
      <search-line-icon class="pointer-events-none absolute inset-s-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
      <input
        :id="id"
        ref="input"
        v-model="query"
        class="input ps-11 pe-10"
        type="text"
        role="combobox"
        autocomplete="off"
        :placeholder="placeholder"
        :aria-label="label"
        :aria-expanded="isOpen"
        :aria-controls="listId"
        :aria-activedescendant="activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined"
        @focus="handleFocus"
        @input="isOpen = true"
        @keydown.down.prevent="handleMove(1)"
        @keydown.up.prevent="handleMove(-1)"
        @keydown.enter.prevent="handlePickActive"
      />
      <check-line-icon v-if="selectedComputed && !isOpen" class="pointer-events-none absolute inset-e-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-brand" />
    </div>

    <Teleport to="body">
      <Transition name="menu-pop">
        <div v-if="isOpen && (filteredComputed.length || canCreateComputed)" ref="panel" class="menu-panel menu-panel-floating" :style="panelStyle" :data-placement="placement">
          <ul :id="listId" role="listbox" :aria-label="label" class="menu-list">
            <li
              v-for="(option, index) in filteredComputed"
              :id="`${listId}-${index}`"
              :key="option.value"
              role="option"
              class="menu-option"
              :class="{ 'menu-option-active': index === activeIndex }"
              :aria-selected="option.value === modelValue"
              @mousedown.prevent
              @mousemove="activeIndex = index"
              @click="handlePick(option)"
            >
              <span class="min-w-0 flex-1">
                <span class="block truncate">{{ option.label }}</span>
                <span v-if="option.detail" class="block truncate body-three">{{ option.detail }}</span>
              </span>
              <check-line-icon v-if="option.value === modelValue" class="h-4 w-4 shrink-0 text-fg-brand" />
            </li>
            <li
              v-if="canCreateComputed"
              :id="`${listId}-${filteredComputed.length}`"
              role="option"
              class="menu-option border-t border-subtle"
              :class="{ 'menu-option-active': activeIndex === filteredComputed.length }"
              aria-selected="false"
              @mousedown.prevent
              @mousemove="activeIndex = filteredComputed.length"
              @click="handleCreate"
            >
              <add-line-icon class="h-4 w-4 shrink-0 text-fg-brand" />
              <span class="min-w-0 flex-1 truncate font-medium text-fg-brand">{{ $t('global.combobox.create', { query: query.trim() }) }}</span>
              <span class="chip bg-selected text-fg-brand">{{ $t('global.combobox.createHint') }}</span>
            </li>
          </ul>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, useId, watch } from 'vue';

import { filterOptions, foldText } from 'global/composables/select-options';
import { useFloatingPanel } from 'global/composables/use-floating-panel';
import type { ISelectOption } from 'global/types/select';

import AddLineIcon from 'global/icons/add-line.icon.vue';
import CheckLineIcon from 'global/icons/check-line.icon.vue';
import SearchLineIcon from 'global/icons/search-line.icon.vue';

// props
const props = withDefaults(defineProps<{ options: ISelectOption[]; label: string; id?: string; placeholder?: string; canCreate?: boolean }>(), {
  id: undefined,
  placeholder: undefined,
  canCreate: false,
});

// emits
const modelValue = defineModel<string | null>({ required: true });
const emit = defineEmits<{ (event: 'create', name: string): void }>();

// variables
const MAX_SHOWN = 8;
const listId = useId();
const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const query = ref('');
const activeIndex = ref(-1);
const { panelStyle, placement } = useFloatingPanel(root, panel, isOpen, () => close());

// computed
const selectedComputed = computed((): ISelectOption | undefined => props.options.find((option) => option.value === modelValue.value));
const isBrowsingComputed = computed((): boolean => query.value === (selectedComputed.value?.label ?? ''));
const filteredComputed = computed((): ISelectOption[] => filterOptions(props.options, isBrowsingComputed.value ? '' : query.value).slice(0, MAX_SHOWN));
const canCreateComputed = computed((): boolean => props.canCreate && Boolean(query.value.trim()) && !props.options.some((option) => foldText(option.label) === foldText(query.value.trim())));
const rowCountComputed = computed((): number => filteredComputed.value.length + (canCreateComputed.value ? 1 : 0));

// watchers
watch(
  selectedComputed,
  (selected) => {
    query.value = selected?.label ?? '';
  },
  { immediate: true },
);
watch(query, () => {
  activeIndex.value = rowCountComputed.value ? 0 : -1;
});

// methods
const close = (): void => {
  isOpen.value = false;
  query.value = selectedComputed.value?.label ?? '';
};

// event handlers
const handleFocus = (): void => {
  isOpen.value = true;
  input.value?.select();
};

const handleMove = (step: number): void => {
  isOpen.value = true;
  const count = rowCountComputed.value;
  if (count) activeIndex.value = (activeIndex.value + step + count) % count;
};

const handlePick = (option: ISelectOption): void => {
  modelValue.value = option.value;
  query.value = option.label;
  isOpen.value = false;
};

const handleCreate = (): void => {
  const name = query.value.trim();
  isOpen.value = false;
  emit('create', name);
};

const handlePickActive = (): void => {
  if (activeIndex.value === filteredComputed.value.length && canCreateComputed.value) handleCreate();
  else if (filteredComputed.value[activeIndex.value]) handlePick(filteredComputed.value[activeIndex.value]);
};

const handleEscape = (): void => {
  if (isOpen.value) close();
};

const handleFocusOut = (event: FocusEvent): void => {
  if (!root.value?.contains(event.relatedTarget as Node | null)) close();
};
</script>
