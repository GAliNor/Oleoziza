<template>
  <app-layout>
    <management-home-prototype v-if="authStore.session?.role === 'management'" />
    <operator-home-prototype v-else-if="authStore.session?.role === 'operator'" />
    <section v-else class="flex flex-col gap-6">
      <div>
        <h1 class="heading-one">{{ $t('dashboard.welcome', { name: authStore.salutation }) }}</h1>
        <p class="body-two">{{ authStore.isStaff ? $t('dashboard.subtitle') : $t('dashboard.clientSubtitle') }}</p>
      </div>

      <div v-if="authStore.isStaff" class="flex flex-col gap-3">
        <h2 class="heading-two">{{ $t('dashboard.sites') }}</h2>
        <p v-if="siteStore.hasError" class="body-one text-danger-red">{{ $t('dashboard.loadError') }}</p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <template v-if="siteStore.isLoading">
            <div v-for="index in 2" :key="index" class="skeleton h-20" />
          </template>
          <button
            v-for="site in siteStore.accessibleSites"
            v-else
            :key="site.id"
            type="button"
            class="card flex items-center gap-3 text-left transition-colors hover:border-primary-olive"
            :class="{ 'border-primary-olive': site.id === siteStore.currentSiteId || siteStore.isAllSites }"
            @click="handleSelectSite(site.id)"
          >
            <map-pin-line-icon class="h-6 w-6 text-accent-rust" />
            <div>
              <p class="font-medium text-neutral-800">{{ site.name }}</p>
              <p class="body-two">{{ site.city }}</p>
            </div>
          </button>
        </div>
        <p class="body-two">
          {{ $t('dashboard.permissionCount', currentPermissionCount) }}
          <span v-can="'finance.view'"> · {{ $t('dashboard.financeVisible') }}</span>
        </p>
      </div>

      <p class="body-two">{{ $t('dashboard.dataSource', { source: DATA_SOURCE }) }}</p>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { DATA_SOURCE } from 'global/services/base';
import { PERMISSIONS } from 'auth/constants/permissions';

import AppLayout from 'global/components/app-layout.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';
import ManagementHomePrototype from 'dashboard/prototype/management-home.prototype.vue';
import OperatorHomePrototype from 'dashboard/prototype/operator-home.prototype.vue';

// stores
const authStore = useAuthStore();
const siteStore = useSiteStore();

// computed
const currentPermissionCount = computed((): number => PERMISSIONS.filter((permission) => authStore.can(permission)).length);

// event handlers
const handleSelectSite = (siteId: string): void => {
  siteStore.selectSite(siteId);
};
</script>
