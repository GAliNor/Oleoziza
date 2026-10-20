<template>
  <div class="min-h-dvh md:flex">
    <aside class="hidden w-64 shrink-0 flex-col gap-6 border-r border-neutral-200 bg-white p-4 md:flex">
      <div class="flex items-center gap-2 px-3">
        <olive-fill-icon class="h-8 w-8 text-primary-olive" />
        <span class="text-xl font-semibold text-accent-brown">{{ $t('global.appName') }}</span>
      </div>
      <nav class="flex flex-col gap-1">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="nav-link"
          active-class="nav-link-active"
        >
          <component :is="item.icon" class="h-5 w-5" />
          {{ $t(item.labelKey) }}
        </router-link>
      </nav>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-neutral-200
          bg-white/90 px-4 py-3 backdrop-blur md:px-8"
      >
        <div class="flex items-center gap-2 md:hidden">
          <olive-fill-icon class="h-7 w-7 text-primary-olive" />
          <span class="text-lg font-semibold text-accent-brown">{{ $t('global.appName') }}</span>
        </div>
        <slot name="header" />
        <network-badge class="ml-auto" />
      </header>

      <main class="flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-8">
        <slot />
      </main>
    </div>

    <nav
      class="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-neutral-200 bg-white
        pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs text-neutral-500"
        active-class="text-primary-olive-dark"
      >
        <component :is="item.icon" class="h-6 w-6" />
        {{ $t(item.labelKey) }}
      </router-link>
    </nav>

    <update-banner />
  </div>
</template>

<script setup lang="ts">
// imports
import type { Component } from 'vue';

import NetworkBadge from 'global/components/network-badge.vue';
import UpdateBanner from 'global/components/update-banner.vue';
import HomeLineIcon from 'global/icons/home-line.icon.vue';
import OliveFillIcon from 'global/icons/olive-fill.icon.vue';

// variables
const navItems: { name: string; labelKey: string; icon: Component }[] = [
  { name: 'dashboard', labelKey: 'global.nav.dashboard', icon: HomeLineIcon },
];
</script>
