<template>
  <app-operator-shell v-if="isOperator">
    <slot />
  </app-operator-shell>
  <div v-else class="min-h-dvh md:flex">
    <aside
      class="hidden w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-default bg-surface p-4
        md:sticky md:top-0 md:flex md:h-dvh"
    >
      <div class="px-3">
        <logo-full-fill-icon class="h-10 w-auto text-fg-brand" />
        <span class="sr-only">{{ $t('global.appName') }}</span>
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
        <p class="truncate px-3 label">{{ sessionStore.fullName }}</p>
        <p v-if="sessionStore.session" class="px-3 body-two">{{ $t(`auth.roles.${sessionStore.session.role}`) }}</p>
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
        <logo-mark-fill-icon class="h-7 w-7 shrink-0 text-fg-brand md:hidden" />
        <app-back-button />
        <site-switcher />
        <slot name="header" />
        <span class="ml-auto" aria-hidden="true" />
        <app-network-badge class="shrink-0" />
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
        class="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 body-three"
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
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useNavigation } from 'global/composables/use-navigation';
import { HOME_ROUTE_NAME } from 'global/constants/navigation';

import AppToast from 'global/components/app-toast.vue';
import AppBackButton from 'global/components/app-back-button.vue';
import AppNetworkBadge from 'global/components/app-network-badge.vue';
import SiteSwitcher from 'site/components/site-switcher.vue';
import LogoutLineIcon from 'global/icons/logout-line.icon.vue';
import LogoFullFillIcon from 'global/icons/logo-full-fill.icon.vue';
import LogoMarkFillIcon from 'global/icons/logo-mark-fill.icon.vue';
import UserSwitchLineIcon from 'global/icons/user-switch-line.icon.vue';
import AppOperatorShell from 'global/components/app-operator-shell.vue';

// stores
const sessionStore = useSessionStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { visibleNavItems, canOpenHome, getLandingRoute } = useNavigation();

// computed
const isOperator = computed((): boolean => sessionStore.session?.role === 'operator');
const canSwitchOperator = computed((): boolean => sessionStore.session?.role === 'operator');

// watchers
watch(
  () => siteStore.currentSiteId,
  () => {
    if (!sessionStore.session) return;
    const isAllowed = route.name === HOME_ROUTE_NAME ? canOpenHome() : !route.meta.permission || siteStore.can(route.meta.permission);
    if (!isAllowed) router.replace(getLandingRoute() ?? { name: HOME_ROUTE_NAME });
  },
);

watch(
  () => sessionStore.hasExpired,
  (hasExpired) => {
    if (!hasExpired) return;
    toastStore.push(t('auth.errors.session_expired'), 'danger');
    router.replace({ name: 'auth-login', query: { redirect: route.fullPath } });
  },
);

// event handlers
const handleSwitchOperator = (): void => {
  router.push({ name: 'auth-lock' });
};

const handleLogout = (): void => {
  router.push({ name: 'auth-logout' });
};
</script>
