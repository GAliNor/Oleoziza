<template>
  <operator-shell v-if="isOperator">
    <slot />
  </operator-shell>
  <div v-else class="min-h-dvh md:flex">
    <aside class="hidden w-64 shrink-0 flex-col gap-6 border-r border-neutral-200 bg-white p-4 md:flex">
      <div class="flex items-center gap-2 px-3">
        <olive-fill-icon class="h-8 w-8 text-primary-olive" />
        <span class="text-xl font-semibold text-accent-brown">{{ $t('global.appName') }}</span>
      </div>
      <nav class="flex flex-col gap-1">
        <router-link
          v-for="item in visibleNavItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="nav-link"
          active-class="nav-link-active"
        >
          <component :is="item.icon" class="h-5 w-5" />
          {{ $t(item.labelKey) }}
        </router-link>
      </nav>
      <div class="mt-auto flex flex-col gap-1 border-t border-neutral-200 pt-4">
        <p class="truncate px-3 text-sm font-medium text-neutral-800">{{ authStore.fullName }}</p>
        <p v-if="authStore.session" class="px-3 body-two">{{ $t(`auth.roles.${authStore.session.role}`) }}</p>
        <button v-if="canSwitchOperator" type="button" class="nav-link mt-2" @click="handleSwitchOperator">
          <user-switch-line-icon class="h-5 w-5" />
          {{ $t('auth.switch.action') }}
        </button>
        <button type="button" class="nav-link" @click="handleLogout">
          <logout-line-icon class="h-5 w-5" />
          {{ $t('auth.logout') }}
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-40 flex items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 py-3
          backdrop-blur md:px-8"
      >
        <olive-fill-icon class="h-7 w-7 shrink-0 text-primary-olive md:hidden" />
        <site-switcher />
        <slot name="header" />
        <span class="ml-auto" aria-hidden="true" />
        <network-badge class="shrink-0" />
        <button
          v-if="canSwitchOperator"
          type="button"
          class="icon-btn md:hidden"
          :aria-label="$t('auth.switch.action')"
          @click="handleSwitchOperator"
        >
          <user-switch-line-icon class="h-5 w-5" />
        </button>
        <button type="button" class="icon-btn md:hidden" :aria-label="$t('auth.logout')" @click="handleLogout">
          <logout-line-icon class="h-5 w-5" />
        </button>
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
        v-for="item in visibleNavItems"
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
    <app-toast />
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, type Component } from 'vue';
import { useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import type { Permission } from 'auth/types/auth';

import AppToast from 'global/components/app-toast.vue';
import NetworkBadge from 'global/components/network-badge.vue';
import SiteSwitcher from 'global/components/site-switcher.vue';
import UpdateBanner from 'global/components/update-banner.vue';
import HomeLineIcon from 'global/icons/home-line.icon.vue';
import LogoutLineIcon from 'global/icons/logout-line.icon.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';
import OliveFillIcon from 'global/icons/olive-fill.icon.vue';
import UserSwitchLineIcon from 'global/icons/user-switch-line.icon.vue';
import OperatorShell from 'global/components/operator-shell.vue';

// stores
const authStore = useAuthStore();
const router = useRouter();

// variables
const navItems: { name: string; labelKey: string; icon: Component; permission?: Permission }[] = [
  { name: 'dashboard', labelKey: 'global.nav.dashboard', icon: HomeLineIcon },
  { name: 'site', labelKey: 'global.nav.sites', icon: MapPinLineIcon, permission: 'site.manage' },
];

// computed
const visibleNavItems = computed(() => navItems.filter((item) => !item.permission || authStore.can(item.permission)));
const isOperator = computed((): boolean => authStore.session?.role === 'operator');
const canSwitchOperator = computed((): boolean => authStore.session?.role === 'operator');

// event handlers
const handleSwitchOperator = async (): Promise<void> => {
  authStore.lock();
  await router.push({ name: 'auth-switch' });
};

const handleLogout = async (): Promise<void> => {
  await authStore.logout();
  await router.push({ name: 'auth-login' });
};
</script>
