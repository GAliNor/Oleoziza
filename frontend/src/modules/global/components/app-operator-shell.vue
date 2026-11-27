<template>
  <div class="flex min-h-dvh min-w-0 flex-col">
    <div class="sticky top-0 z-30">
      <div v-if="isOperatorMode" class="flex items-center justify-between gap-3 bg-accent-brown px-4 py-2 text-white md:px-8" role="status">
        <span class="min-w-0 truncate text-sm font-semibold">{{ $t('global.shell.operatorMode') }}</span>
        <button type="button" class="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-control bg-white/15 px-3 text-sm font-semibold hover:bg-white/25" @click="returnToManagement">
          <arrow-left-line-icon class="h-4 w-4 rtl:-scale-x-100" />
          {{ $t('global.shell.backToManagement') }}
        </button>
      </div>
      <header class="flex items-center gap-1.5 border-b border-default bg-surface/90 px-4 py-2.5 backdrop-blur md:gap-2 md:px-8">
        <router-link :to="{ name: 'dashboard' }" class="shrink-0 max-md:has-[+button]:hidden" :aria-label="$t('global.nav.dashboard')">
          <ui-logo variant="mark" class="h-8 w-8" />
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
        <app-user-menu :trigger-label="$t('global.shell.profileMenu', { name: firstNameComputed })" @logout="handleLogout">
          <template #trigger>
            <ui-avatar class="h-9 w-9 shrink-0" :name="sessionStore.fullName" :variant="STAFF_AVATAR_VARIANT" fallback-class="bg-accent-brown text-white" />
            <span class="max-w-24 min-w-0 truncate max-sm:sr-only">{{ firstNameComputed }}</span>
          </template>
        </app-user-menu>
      </header>
    </div>

    <main class="flex-1 px-4 pt-6 pb-10 md:px-8">
      <app-sync-issues />
      <slot />
    </main>
    <app-page-decoration />

    <app-toast />
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useSyncStore } from 'global/stores/sync';
import { useOperatorMode } from 'global/composables/use-operator-mode';

import { STAFF_AVATAR_VARIANT } from 'user/constants/user';
import AppToast from 'global/components/app-toast.vue';
import UiAvatar from 'global/components/ui-avatar.vue';
import AppBackButton from 'global/components/app-back-button.vue';
import AppNetworkBadge from 'global/components/app-network-badge.vue';
import AppPageDecoration from 'global/components/app-page-decoration.vue';
import AppSyncIssues from 'global/components/app-sync-issues.vue';
import SiteSwitcher from 'site/components/site-switcher.vue';
import AppUserMenu from 'global/components/app-user-menu.vue';
import UiLogo from 'global/components/ui-logo.vue';
import RefreshLineIcon from 'global/icons/refresh-line.icon.vue';
import SearchLineIcon from 'global/icons/search-line.icon.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';

// stores
const router = useRouter();
const sessionStore = useSessionStore();
const syncStore = useSyncStore();
const { isOperatorMode, returnToManagement } = useOperatorMode();

// computed
const firstNameComputed = computed((): string => sessionStore.session?.firstName ?? '');

// event handlers
const handleLogout = (): void => {
  router.push({ name: 'auth-logout' });
};
</script>
