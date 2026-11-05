<template>
  <app-operator-shell v-if="isOperatorShell">
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
          <span v-if="badgeCounts[item.name]" class="nav-badge ms-auto">{{ badgeCounts[item.name] }}</span>
        </router-link>
      </nav>
      <div class="mt-auto flex flex-col gap-1 border-t border-default pt-4">
        <p class="truncate px-3 label">{{ sessionStore.fullName }}</p>
        <p v-if="sessionStore.session" class="px-3 body-two">{{ $t(`auth.roles.${sessionStore.session.role}`) }}</p>
        <ui-language-switch class="mt-2" />
        <button v-if="canSwitchOperator" type="button" class="nav-link" @click="handleSwitchOperator">
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
      <div class="sticky top-0 z-40">
        <div v-if="isJumped" class="flex items-center justify-between gap-3 bg-accent-brown px-4 py-2 text-white md:px-8" role="status">
          <span class="min-w-0 truncate text-sm font-semibold">{{ $t('global.shell.backofficeMode') }}</span>
          <button type="button" class="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-control bg-white/15 px-3 text-sm font-semibold hover:bg-white/25" @click="returnToOperator">
            <arrow-left-line-icon class="h-4 w-4" />
            {{ $t('global.shell.backToOperator') }}
          </button>
        </div>
      <header
        class="flex items-center gap-3 border-b border-default bg-surface/90 px-4 py-3
          backdrop-blur md:px-8"
      >
        <logo-mark-fill-icon class="h-7 w-7 shrink-0 text-fg-brand md:hidden" />
        <app-back-button />
        <site-switcher />
        <slot name="header" />
        <span class="ms-auto" aria-hidden="true" />
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
        <app-user-menu class="md:hidden" @logout="handleLogout" />
      </header>
      </div>

      <main class="flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-8">
        <slot />
      </main>
    </div>

    <nav
      class="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-default bg-surface
        pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <router-link
        v-for="item in barItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 body-three"
        active-class="text-fg-brand"
      >
        <span class="relative">
          <component :is="item.icon" class="h-6 w-6" />
          <span v-if="badgeCounts[item.name]" class="nav-badge absolute -top-1.5 -end-2.5">{{ badgeCounts[item.name] }}</span>
        </span>
        <span class="max-w-full truncate whitespace-nowrap">{{ $t(item.shortLabelKey ?? item.labelKey) }}</span>
      </router-link>
      <div v-if="moreItems.length" class="relative flex min-w-0 flex-1" @focusout="handleMoreFocusOut">
        <button
          type="button"
          class="flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 body-three"
          :class="{ 'text-fg-brand': isMoreActive }"
          :aria-expanded="isMoreOpen"
          aria-haspopup="true"
          @click="isMoreOpen = !isMoreOpen"
        >
          <more-line-icon class="h-6 w-6" />
          {{ $t('global.nav.more') }}
        </button>
        <div v-if="isMoreOpen" class="absolute inset-e-2 bottom-full mb-2 flex min-w-52 flex-col gap-1 rounded-card border border-default bg-surface p-2 shadow-overlay">
          <router-link v-for="item in moreItems" :key="item.name" :to="{ name: item.name }" class="nav-link" active-class="nav-link-active" @click="isMoreOpen = false">
            <component :is="item.icon" class="h-5 w-5" />
            {{ $t(item.labelKey) }}
          </router-link>
        </div>
      </div>
    </nav>

    <app-toast />
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useNavigation } from 'global/composables/use-navigation';
import { useBackofficeJump } from 'global/composables/use-backoffice-jump';
import { HOME_ROUTE_NAME } from 'global/constants/navigation';
import { useTasks } from 'task/composables/use-tasks';
import { TASK_ROUTE_NAME } from 'task/constants/task';
import type { INavItem } from 'global/types/navigation';

import AppToast from 'global/components/app-toast.vue';
import AppBackButton from 'global/components/app-back-button.vue';
import AppNetworkBadge from 'global/components/app-network-badge.vue';
import SiteSwitcher from 'site/components/site-switcher.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import LogoutLineIcon from 'global/icons/logout-line.icon.vue';
import MoreLineIcon from 'global/icons/more-line.icon.vue';
import LogoFullFillIcon from 'global/icons/logo-full-fill.icon.vue';
import LogoMarkFillIcon from 'global/icons/logo-mark-fill.icon.vue';
import UserSwitchLineIcon from 'global/icons/user-switch-line.icon.vue';
import AppOperatorShell from 'global/components/app-operator-shell.vue';
import AppUserMenu from 'global/components/app-user-menu.vue';
import UiLanguageSwitch from 'global/components/ui-language-switch.vue';

// stores
const sessionStore = useSessionStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { visibleNavItems, canOpenHome, getLandingRoute } = useNavigation();
const { canJump, isJumped, returnToOperator } = useBackofficeJump();
const { tasks, load: loadTasks } = useTasks();

// variables
const BAR_ITEM_LIMIT = 5;
const isMoreOpen = ref(false);

// computed
const barItems = computed((): INavItem[] => (visibleNavItems.value.length > BAR_ITEM_LIMIT ? visibleNavItems.value.slice(0, BAR_ITEM_LIMIT - 1) : visibleNavItems.value));
const moreItems = computed((): INavItem[] => visibleNavItems.value.slice(barItems.value.length));
const isMoreActive = computed((): boolean => moreItems.value.some((item) => item.name === route.name));
const isOperatorShell = computed((): boolean => sessionStore.session?.role === 'operator' && !sessionStore.isBackofficeMode);
const canSwitchOperator = computed((): boolean => sessionStore.session?.role === 'operator');
const hasTaskItem = computed((): boolean => visibleNavItems.value.some((item) => item.name === TASK_ROUTE_NAME));
const badgeCounts = computed((): Record<string, number> => ({ [TASK_ROUTE_NAME]: hasTaskItem.value ? tasks.value.length : 0 }));

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

watch(
  [hasTaskItem, () => siteStore.currentSiteId],
  ([isShown]) => {
    if (isShown) loadTasks();
  },
  { immediate: true },
);

watch(canJump, (canStillJump) => {
  if (isJumped.value && !canStillJump) returnToOperator();
});

// event handlers
const handleMoreFocusOut = (event: FocusEvent): void => {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) isMoreOpen.value = false;
};

const handleSwitchOperator = (): void => {
  router.push({ name: 'auth-lock' });
};

const handleLogout = (): void => {
  router.push({ name: 'auth-logout' });
};
</script>
