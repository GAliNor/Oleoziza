<template>
  <header class="flex min-w-0 items-center gap-3">
    <span class="grid h-10 w-10 shrink-0 place-items-center rounded-card" :class="SECTION_TONES[tone]">
      <component :is="icon" class="h-5 w-5" />
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 class="heading-four">{{ title }}</h2>
        <span v-if="summary" class="text-sm font-medium text-fg-secondary-paragraph tabular-nums">{{ summary }}</span>
      </div>
      <p v-if="hint" class="body-three max-w-prose">{{ hint }}</p>
    </div>
  </header>
</template>

<script setup lang="ts">
// imports
import type { Component } from 'vue';

import { SECTION_TONES } from 'global/constants/section';
import type { SectionTone } from 'global/types/section';

// props
withDefaults(defineProps<{ title: string; icon: Component; tone?: SectionTone; hint?: string; summary?: string }>(), { tone: 'neutral', hint: undefined, summary: undefined });
</script>
