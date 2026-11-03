<template>
  <operator-shell v-if="isOperator">
    <slot />
  </operator-shell>
  <div v-else class="min-h-dvh md:flex">
    <aside
      class="hidden w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-default bg-surface p-4
        md:sticky md:top-0 md:flex md:h-dvh"
    >
      <div class="flex items-center gap-2 px-3">
        <olive-fill-icon class="h-8 w-8 text-fg-brand" />
        <span class="text-xl font-semibold text-fg-accent">{{ $t('global.appName') }}</span>
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
      <div class="mt-auto flex flex-col gap-1 border-t border-default pt-4">
        <p class="truncate px-3 text-sm font-medium text-fg-default">{{ authStore.fullName }}</p>
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
        class="sticky top-0 z-40 flex items-center gap-3 border-b border-default bg-surface/90 px-4 py-3
          backdrop-blur md:px-8"
      >
        <olive-fill-icon class="h-7 w-7 shrink-0 text-fg-brand md:hidden" />
        <back-button />
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
      class="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-default bg-surface
        pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <router-link
        v-for="item in visibleNavItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs text-fg-secondary-paragraph"
        active-class="text-fg-brand"
      >
        <component :is="item.icon" class="h-6 w-6" />
        <span class="max-w-full truncate whitespace-nowrap">{{ $t(item.shortLabelKey ?? item.labelKey) }}</span>
      </router-link>
    </nav>

    <app-toast />
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { useNavigation } from 'global/composables/use-navigation';
import { HOME_ROUTE_NAME } from 'global/constants/navigation';

import AppToast from 'global/components/app-toast.vue';
import BackButton from 'global/components/back-button.vue';
import NetworkBadge from 'global/components/network-badge.vue';
import SiteSwitcher from 'global/components/site-switcher.vue';
import LogoutLineIcon from 'global/icons/logout-line.icon.vue';
import OliveFillIcon from 'global/icons/olive-fill.icon.vue';
import UserSwitchLineIcon from 'global/icons/user-switch-line.icon.vue';
import OperatorShell from 'global/components/operator-shell.vue';

// stores
const authStore = useAuthStore();
const siteStore = useSiteStore();
const route = useRoute();
const router = useRouter();
const { visibleNavItems, canOpenHome, getLandingRoute } = useNavigation();

// computed
const isOperator = computed((): boolean => authStore.session?.role === 'operator');
const canSwitchOperator = computed((): boolean => authStore.session?.role === 'operator');

// watchers
watch(
  () => siteStore.currentSiteId,
  () => {
    const isAllowed = route.name === HOME_ROUTE_NAME ? canOpenHome() : !route.meta.permission || authStore.can(route.meta.permission);
    if (!isAllowed) router.replace(getLandingRoute() ?? { name: HOME_ROUTE_NAME });
  },
);

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
