<template>
  <div class="flex min-h-dvh min-w-0 flex-col">
    <header class="sticky top-0 z-30 flex items-center gap-1.5 border-b border-default bg-surface/90 px-4 py-2.5 backdrop-blur md:gap-2 md:px-8">
      <router-link :to="{ name: 'dashboard' }" class="shrink-0 max-md:has-[+button]:hidden" :aria-label="$t('global.nav.dashboard')">
        <logo-mark-fill-icon class="h-7 w-7 text-fg-brand" />
      </router-link>
      <app-back-button />
      <site-switcher class="flex-1" />
      <app-network-badge class="shrink-0" />
      <router-link :to="{ name: 'client-search' }" class="icon-btn shrink-0" :aria-label="$t('global.shell.search')">
        <search-line-icon class="h-5 w-5" />
      </router-link>
      <span
        v-if="syncStore.pendingCount"
        class="chip shrink-0 bg-warning-subtle py-1.5 text-fg-warning"
        role="status"
        :title="$t('global.shell.pendingSync', syncStore.pendingCount)"
      >
        <refresh-line-icon class="h-4 w-4" /> {{ syncStore.pendingCount }}
      </span>
      <button
        type="button"
        class="flex min-h-11 min-w-0 items-center gap-2 rounded-full border border-default bg-surface pr-3 pl-1 label"
        :aria-label="$t('global.shell.switchOperator', { name: operatorName })"
        @click="handleSwitchOperator"
      >
        <ui-avatar class="h-9 w-9 shrink-0" :name="sessionStore.fullName" :variant="STAFF_AVATAR_VARIANT" fallback-class="bg-accent-brown text-white" />
        <span class="max-w-24 min-w-0 truncate">{{ operatorName }}</span>
        <user-switch-line-icon class="h-4 w-4 shrink-0 text-fg-secondary-paragraph max-[380px]:hidden" />
      </button>
      <button type="button" class="icon-btn shrink-0" :aria-label="$t('auth.logout')" @click="handleLogout">
        <logout-line-icon class="h-5 w-5" />
      </button>
    </header>

    <main class="flex-1 px-4 pt-6 pb-10 md:px-8">
      <slot />
    </main>

    <app-toast />
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useSyncStore } from 'global/stores/sync';

import { STAFF_AVATAR_VARIANT } from 'user/constants/user';
import AppToast from 'global/components/app-toast.vue';
import UiAvatar from 'global/components/ui-avatar.vue';
import AppBackButton from 'global/components/app-back-button.vue';
import AppNetworkBadge from 'global/components/app-network-badge.vue';
import SiteSwitcher from 'site/components/site-switcher.vue';
import LogoutLineIcon from 'global/icons/logout-line.icon.vue';
import LogoMarkFillIcon from 'global/icons/logo-mark-fill.icon.vue';
import RefreshLineIcon from 'global/icons/refresh-line.icon.vue';
import SearchLineIcon from 'global/icons/search-line.icon.vue';
import UserSwitchLineIcon from 'global/icons/user-switch-line.icon.vue';

// stores
const router = useRouter();
const sessionStore = useSessionStore();
const syncStore = useSyncStore();

// computed
const operatorName = computed((): string => sessionStore.session?.firstName ?? '');

// event handlers
const handleSwitchOperator = (): void => {
  router.push({ name: 'auth-lock' });
};

const handleLogout = (): void => {
  router.push({ name: 'auth-logout' });
};
</script>
