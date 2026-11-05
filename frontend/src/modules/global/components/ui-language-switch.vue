<template>
  <div class="relative grid grid-cols-2 rounded-control bg-subtle p-1" role="radiogroup" :aria-label="$t('global.language.label')">
    <span
      class="pointer-events-none absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-md bg-surface shadow-raised
        transition-[inset-inline-start] duration-500 ease-(--ease-sheet)"
      :class="selectedIndex === 0 ? 'start-1' : 'start-1/2'"
      aria-hidden="true"
    />
    <button
      v-for="language in LANGUAGES"
      :key="language"
      type="button"
      role="radio"
      class="press relative z-10 flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium whitespace-nowrap"
      :class="language === locale ? 'text-fg-display' : 'text-fg-secondary-paragraph hover:text-fg-display'"
      :aria-checked="language === locale"
      :lang="language"
      @click="handleSelect(language)"
    >
      <component
        :is="LANGUAGE_FLAGS[language]"
        class="h-3 w-auto shrink-0 transition-[opacity,filter] duration-300"
        :class="language === locale ? '' : 'opacity-60 grayscale-[40%]'"
      />
      <span class="truncate">{{ LANGUAGE_NAMES[language] }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSessionStore } from 'global/stores/session';
import { chooseLanguage } from 'global/composables/language';
import { LANGUAGE_FLAGS, LANGUAGE_NAMES, LANGUAGES } from 'global/constants/locale';
import type { Language } from 'global/types/locale';

// stores
const { locale } = useI18n({ useScope: 'global' });
const sessionStore = useSessionStore();

// computed
const selectedIndex = computed((): number => LANGUAGES.indexOf(locale.value as Language));

// event handlers
const handleSelect = (language: Language): void => {
  if (language !== locale.value) chooseLanguage(language, sessionStore.session?.userId);
};
</script>
