<template>
  <div class="min-h-dvh md:flex">
    <nav
      class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-2 border-t border-neutral-200 bg-white p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]
        md:sticky md:top-0 md:h-dvh md:w-28 md:shrink-0 md:grid-cols-1 md:content-start md:border-t-0 md:border-r md:p-3"
      :aria-label="$t('global.shell.dock')"
    >
      <router-link :to="{ name: 'dashboard' }" class="mb-2 hidden justify-center md:flex" :aria-label="$t('global.nav.dashboard')">
        <olive-fill-icon class="h-9 w-9 text-primary-olive" />
      </router-link>
      <router-link
        v-for="action in visibleActions"
        :key="action.key"
        :to="action.to"
        class="dock-action"
        :class="action.tone"
      >
        <component :is="action.icon" class="h-6 w-6" />
        {{ $t(`global.shell.actions.${action.key}`) }}
      </router-link>
    </nav>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-30 flex items-center gap-2 border-b border-neutral-200 bg-white/90 px-4 py-2.5 backdrop-blur md:px-8">
        <router-link :to="{ name: 'dashboard' }" class="shrink-0 md:hidden" :aria-label="$t('global.nav.dashboard')">
          <olive-fill-icon class="h-7 w-7 text-primary-olive" />
        </router-link>
        <site-switcher />
        <span class="ml-auto" aria-hidden="true" />
        <network-badge class="shrink-0" />
        <router-link :to="{ name: 'client-search' }" class="icon-btn shrink-0" :aria-label="$t('global.shell.search')">
          <search-line-icon class="h-5 w-5" />
        </router-link>
        <span
          v-if="syncStore.pendingCount"
          class="chip shrink-0 bg-warning-amber/15 py-1.5 text-warning-amber"
          role="status"
          :title="$t('global.shell.pendingSync', syncStore.pendingCount)"
        >
          <refresh-line-icon class="h-4 w-4" /> {{ syncStore.pendingCount }}
        </span>
        <button
          type="button"
          class="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-white pr-3 pl-1 text-sm font-medium text-neutral-800"
          :aria-label="$t('global.shell.switchOperator', { name: operatorName })"
          @click="handleSwitchOperator"
        >
          <span class="avatar h-9 w-9 bg-accent-brown text-white">{{ operatorName.slice(0, 1) }}</span>
          <span class="max-w-24 truncate">{{ operatorName }}</span>
          <user-switch-line-icon class="h-4 w-4 text-neutral-500" />
        </button>
        <button type="button" class="icon-btn shrink-0" :aria-label="$t('auth.logout')" @click="handleLogout">
          <logout-line-icon class="h-5 w-5" />
        </button>
      </header>

      <main class="flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-8">
        <slot />
      </main>
    </div>

    <update-banner />
    <app-toast />
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, type Component } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useSyncStore } from 'global/stores/sync';
import type { Permission } from 'auth/types/auth';

import AppToast from 'global/components/app-toast.vue';
import NetworkBadge from 'global/components/network-badge.vue';
import SiteSwitcher from 'global/components/site-switcher.vue';
import UpdateBanner from 'global/components/update-banner.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import CoinsLineIcon from 'global/icons/coins-line.icon.vue';
import DropLineIcon from 'global/icons/drop-line.icon.vue';
import LogoutLineIcon from 'global/icons/logout-line.icon.vue';
import OliveFillIcon from 'global/icons/olive-fill.icon.vue';
import RefreshLineIcon from 'global/icons/refresh-line.icon.vue';
import ScaleLineIcon from 'global/icons/scale-line.icon.vue';
import SearchLineIcon from 'global/icons/search-line.icon.vue';
import UserSwitchLineIcon from 'global/icons/user-switch-line.icon.vue';

// stores
const router = useRouter();
const authStore = useAuthStore();
const syncStore = useSyncStore();

// variables
const DOCK_ACTIONS: { key: string; to: RouteLocationRaw; icon: Component; tone: string; permission: Permission }[] = [
  { key: 'reception', to: { name: 'reception-new' }, icon: AddLineIcon, tone: 'bg-primary-olive-dark text-white', permission: 'reception.create' },
  { key: 'weigh', to: { name: 'reception-weigh' }, icon: ScaleLineIcon, tone: 'bg-primary-olive-light text-primary-olive-dark', permission: 'weighing.create' },
  {
    key: 'withdrawal',
    to: { name: 'client-search', query: { for: 'withdrawal' } },
    icon: DropLineIcon,
    tone: 'bg-accent-sand/30 text-accent-brown',
    permission: 'withdrawal.create',
  },
  {
    key: 'payment',
    to: { name: 'client-search', query: { for: 'payment' } },
    icon: CoinsLineIcon,
    tone: 'bg-neutral-100 text-neutral-800',
    permission: 'payment.record',
  },
];

// computed
const operatorName = computed((): string => authStore.session?.firstName ?? '');
const visibleActions = computed(() => DOCK_ACTIONS.filter((action) => authStore.can(action.permission)));

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
