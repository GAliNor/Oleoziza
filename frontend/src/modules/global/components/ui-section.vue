<template>
  <section class="card @container flex min-w-0 flex-col p-0">
    <ui-section-header class="border-b border-subtle px-4 py-3" :title="title" :icon="icon" :tone="tone" :hint="hint" :summary="summary" />
    <div class="flex min-w-0 flex-col gap-1 p-2">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import type { Component } from 'vue';

import type { SectionTone } from 'global/types/section';

import UiSectionHeader from 'global/components/ui-section-header.vue';

// props
/** A group of settings or properties: its mark, its title, what it holds, then its rows. */
withDefaults(defineProps<{ title: string; icon: Component; tone?: SectionTone; hint?: string; summary?: string }>(), { tone: 'neutral', hint: undefined, summary: undefined });
</script>
