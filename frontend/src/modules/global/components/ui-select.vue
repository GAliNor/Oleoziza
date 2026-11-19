<template>
  <div ref="root" class="relative min-w-0" @focusout="handleFocusOut" @keydown.esc.stop="handleEscape">
    <button
      :id="id"
      ref="trigger"
      type="button"
      class="select-trigger"
      :disabled="isDisabled"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-label="label"
      @pointerdown="handlePointerDown"
      @click="handleToggle"
      @keydown.down.prevent="handleOpen"
      @keydown.up.prevent="handleOpen"
    >
      <span class="min-w-0 truncate" :class="{ 'text-fg-muted': !selectedComputed }">{{ selectedComputed?.label ?? placeholder ?? $t('global.select.placeholder') }}</span>
      <chevron-up-down-line-icon class="h-4 w-4 shrink-0 text-fg-muted" />
    </button>

    <Teleport to="body">
      <Transition name="menu-pop">
        <div
          v-if="isOpen"
          ref="panel"
          class="menu-panel menu-panel-floating"
          :style="panelStyle"
          :data-placement="placement"
          @focusout="handleFocusOut"
          @keydown.esc.stop="handleEscape"
          @keydown.down.prevent="handleMove(1)"
          @keydown.up.prevent="handleMove(-1)"
          @keydown.enter.prevent="handlePickActive"
        >
          <input v-if="isSearchable" ref="searchInput" v-model="query" class="menu-search" type="search" :placeholder="$t('global.select.search')" :aria-label="$t('global.select.search')" />
          <ul ref="list" role="listbox" :aria-label="label" class="menu-list" tabindex="-1" :aria-activedescendant="activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined">
            <template v-for="row in rowsComputed" :key="row.kind === 'group' ? `group-${row.label}` : row.option.value">
              <li v-if="row.kind === 'group'" class="menu-group" role="presentation">{{ row.label }}</li>
              <li
                v-else
                :id="`${listId}-${row.index}`"
                role="option"
                class="menu-option"
                :class="{ 'menu-option-active': row.index === activeIndex, 'ps-4': row.option.group, 'cursor-not-allowed opacity-40': row.option.isDisabled }"
                :aria-selected="row.option.value === modelValue"
                :aria-disabled="row.option.isDisabled || undefined"
                @mousemove="activeIndex = row.index"
                @click="handlePick(row.option)"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate">{{ row.option.label }}</span>
                  <span v-if="row.option.detail" class="block truncate body-three">{{ row.option.detail }}</span>
                </span>
                <check-line-icon v-if="row.option.value === modelValue" class="h-4 w-4 shrink-0 text-fg-brand" />
              </li>
            </template>
            <li v-if="!filteredComputed.length" class="px-3 py-4 text-center body-two" role="presentation">{{ $t('global.select.empty') }}</li>
          </ul>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, ref, useId, watch } from 'vue';

import { filterOptions, selectRows } from 'global/composables/select-options';
import { useFloatingPanel } from 'global/composables/use-floating-panel';
import type { ISelectOption, SelectRow } from 'global/types/select';

import CheckLineIcon from 'global/icons/check-line.icon.vue';
import ChevronUpDownLineIcon from 'global/icons/chevron-up-down-line.icon.vue';

// props
const props = withDefaults(defineProps<{ options: ISelectOption[]; label: string; id?: string; placeholder?: string; isSearchable?: boolean; isDisabled?: boolean }>(), {
  id: undefined,
  placeholder: undefined,
  isSearchable: false,
  isDisabled: false,
});

// emits
const modelValue = defineModel<string | null>({ required: true });

// variables
const listId = useId();
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const list = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const query = ref('');
const activeIndex = ref(-1);
let openedByTouch = false;
const { panelStyle, placement } = useFloatingPanel(root, panel, isOpen, () => close(false));

// computed
const selectedComputed = computed((): ISelectOption | undefined => props.options.find((option) => option.value === modelValue.value));
const filteredComputed = computed((): ISelectOption[] => filterOptions(props.options, query.value));
const rowsComputed = computed((): SelectRow[] => selectRows(filteredComputed.value));

// watchers
watch(query, () => {
  activeIndex.value = filteredComputed.value.length ? 0 : -1;
});

// methods
const scrollToActive = async (): Promise<void> => {
  await nextTick();
  list.value?.querySelector(`#${CSS.escape(`${listId}-${activeIndex.value}`)}`)?.scrollIntoView({ block: 'nearest' });
};

const close = (isReturningFocus: boolean): void => {
  isOpen.value = false;
  query.value = '';
  if (isReturningFocus) trigger.value?.focus();
};
// event handlers
/** Opened by touch, the search field waits for a tap, so no keyboard covers the list. */
const handleOpen = async (): Promise<void> => {
  if (props.isDisabled) return;
  isOpen.value = true;
  activeIndex.value = Math.max(0, filteredComputed.value.findIndex((option) => option.value === modelValue.value));
  await nextTick();
  if (props.isSearchable && !openedByTouch) searchInput.value?.focus();
  else list.value?.focus({ preventScroll: true });
  openedByTouch = false;
  scrollToActive();
};

const handlePointerDown = (event: PointerEvent): void => {
  openedByTouch = event.pointerType === 'touch';
};

const handleToggle = (): void => {
  if (isOpen.value) close(false);
  else handleOpen();
};

/** Moves to the next option that can be picked, wrapping round. */
const handleMove = (step: number): void => {
  const options = filteredComputed.value;
  const count = options.length;
  for (let tries = 1; tries <= count; tries += 1) {
    const index = (activeIndex.value + step * tries + count * tries) % count;
    if (!options[index].isDisabled) {
      activeIndex.value = index;
      scrollToActive();
      return;
    }
  }
};

const handlePick = (option: ISelectOption): void => {
  if (option.isDisabled) return;
  modelValue.value = option.value;
  close(true);
};

const handlePickActive = (): void => {
  const option = filteredComputed.value[activeIndex.value];
  if (option) handlePick(option);
};

const handleEscape = (): void => {
  if (isOpen.value) close(true);
};

const handleFocusOut = (event: FocusEvent): void => {
  const next = event.relatedTarget as Node | null;
  if (!root.value?.contains(next) && !panel.value?.contains(next)) close(false);
};
</script>
