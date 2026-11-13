<template>
  <div v-if="siteStore.accessibleSites.length" ref="root" class="relative min-w-0" @focusout="handleFocusOut" @keydown.esc="handleEscape">
    <button
      v-if="hasChoice"
      ref="trigger"
      type="button"
      class="site-pill group"
      :aria-label="$t('global.site.label')"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click="handleToggle"
      @keydown.down.prevent="handleOpenAt(0)"
      @keydown.up.prevent="handleOpenAt(options.length - 1)"
    >
      <span class="site-pill-mark"><map-pin-line-icon class="h-4 w-4" /></span>
      <span class="min-w-0 truncate font-semibold text-fg-display">{{ currentLabel }}</span>
      <span v-if="currentCity" class="hidden shrink-0 text-fg-secondary-paragraph lg:inline">{{ currentCity }}</span>
      <chevron-up-down-line-icon class="h-4 w-4 shrink-0 text-fg-muted transition-colors group-hover:text-fg-secondary-paragraph" />
    </button>
    <span v-else class="site-pill cursor-default">
      <span class="site-pill-mark"><map-pin-line-icon class="h-4 w-4" /></span>
      <span class="min-w-0 truncate font-semibold text-fg-display">{{ currentLabel }}</span>
    </span>

    <Transition name="site-menu">
      <div v-if="isOpen" class="site-menu" @keydown.down.prevent="handleMove(1)" @keydown.up.prevent="handleMove(-1)" @keydown.home.prevent="focusOption(0)" @keydown.end.prevent="focusOption(options.length - 1)">
        <p class="px-3 pt-2 pb-1.5 caption">{{ $t('global.site.switchTo') }}</p>
        <ul role="listbox" :aria-label="$t('global.site.label')" class="flex flex-col gap-0.5">
          <template v-for="(option, index) in options" :key="option.id">
            <li v-if="option.id === ALL_SITES" class="mx-2 my-1 border-t border-default" role="separator" aria-hidden="true" />
            <li
              :ref="(element) => (optionElements[index] = element as HTMLElement | null)"
              role="option"
              tabindex="-1"
              class="site-option"
              :aria-selected="option.id === siteStore.currentSiteId"
              @click="handleSelect(option.id)"
              @keydown.enter.prevent="handleSelect(option.id)"
              @keydown.space.prevent="handleSelect(option.id)"
            >
              <span class="site-option-mark" :class="option.id === ALL_SITES ? 'bg-selected text-fg-brand' : 'bg-accent-subtle text-fg-place'">{{ option.mark }}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium text-fg-display">{{ option.name }}</span>
                <span class="block truncate body-three">{{ option.detail }}</span>
              </span>
              <check-line-icon v-if="option.id === siteStore.currentSiteId" class="h-4.5 w-4.5 shrink-0 text-fg-brand" />
            </li>
          </template>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSiteStore } from 'site/stores/site';
import { ALL_SITES } from 'site/constants/site';

import CheckLineIcon from 'global/icons/check-line.icon.vue';
import ChevronUpDownLineIcon from 'global/icons/chevron-up-down-line.icon.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';

// stores
const { t } = useI18n();
const siteStore = useSiteStore();

// variables
interface ISiteOption {
  id: string;
  name: string;
  detail: string;
  mark: string;
}
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const optionElements = ref<(HTMLElement | null)[]>([]);
const isOpen = ref(false);

// computed
const hasChoice = computed((): boolean => siteStore.accessibleSites.length > 1);
const currentLabel = computed((): string => (siteStore.isAllSites ? t('global.site.all') : (siteStore.currentSite?.name ?? '')));
const currentCity = computed((): string => (siteStore.isAllSites ? '' : (siteStore.currentSite?.city ?? '')));
const options = computed((): ISiteOption[] => [
  ...siteStore.accessibleSites.map((site) => ({ id: site.id, name: site.name, detail: site.city, mark: initialsOf(site.name) })),
  ...(siteStore.canSelectAll ? [{ id: ALL_SITES, name: t('global.site.all'), detail: t('global.site.allDetail', { count: siteStore.accessibleSites.length }), mark: String(siteStore.accessibleSites.length) }] : []),
]);

// methods
const initialsOf = (name: string): string =>
  name
    .split(/[\s’'-]+/)
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || name.slice(0, 2).toUpperCase();

const focusOption = (index: number): void => {
  const count = options.value.length;
  optionElements.value[(index + count) % count]?.focus();
};

const close = (isReturningFocus: boolean): void => {
  isOpen.value = false;
  if (isReturningFocus) trigger.value?.focus();
};

// event handlers
const handleOpenAt = async (index: number): Promise<void> => {
  isOpen.value = true;
  await nextTick();
  const selected = options.value.findIndex((option) => option.id === siteStore.currentSiteId);
  focusOption(index === 0 && selected !== -1 ? selected : index);
};

const handleToggle = (): void => {
  if (isOpen.value) close(false);
  else handleOpenAt(0);
};

const handleMove = (step: number): void => {
  const index = optionElements.value.findIndex((element) => element === document.activeElement);
  focusOption(index + step);
};

const handleSelect = (siteId: string): void => {
  siteStore.selectSite(siteId);
  close(true);
};

const handleEscape = (): void => {
  if (isOpen.value) close(true);
};

const handleFocusOut = (event: FocusEvent): void => {
  if (!root.value?.contains(event.relatedTarget as Node | null)) isOpen.value = false;
};
</script>

<style scoped>
@reference "~/style.css";

.site-pill {
  @apply inline-flex h-11 max-w-full min-w-0 items-center gap-2 rounded-full bg-subtle/80 ps-1.5 pe-3 text-sm
    transition-[background-color,box-shadow,transform] duration-200 ease-(--ease-premium);
}

button.site-pill {
  @apply cursor-pointer hover:bg-subtle active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus;
}

button.site-pill:hover,
button.site-pill[aria-expanded='true'] {
  box-shadow: inset 0 0 0 1px var(--border-color-default);
}

button.site-pill[aria-expanded='true'] {
  @apply bg-surface;
}

.site-pill-mark {
  @apply grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-fg-place;
  box-shadow: 0 1px 2px rgb(41 37 36 / 0.12);
}

.site-menu {
  @apply absolute inset-s-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] origin-top-left rounded-2xl border border-default/70
    bg-surface p-1.5 shadow-overlay rtl:origin-top-right;
}

.site-option {
  @apply flex min-h-13 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-1.5 outline-none transition-colors duration-150
    hover:bg-subtle focus-visible:bg-subtle;
}

.site-option[aria-selected='true'] {
  @apply bg-selected/50;
}

.site-option-mark {
  @apply grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-semibold tracking-wide tabular-nums;
}

.site-menu-enter-active {
  transition:
    opacity 0.18s var(--ease-premium),
    transform 0.26s var(--ease-spring);
}

.site-menu-leave-active {
  transition:
    opacity 0.12s ease-in,
    transform 0.12s ease-in;
}

.site-menu-enter-from,
.site-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .site-menu-enter-from,
  .site-menu-leave-to {
    transform: none;
  }
}
</style>
