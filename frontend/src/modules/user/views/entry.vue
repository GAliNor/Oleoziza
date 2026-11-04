<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
      <header class="rise flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="flex flex-col gap-1">
          <h1 class="heading-one">{{ $t('user.title') }}</h1>
          <p class="body-two">{{ $t('user.subtitle', { scope: scopeLabel }) }} · {{ $t('user.count', activeCount) }}</p>
        </div>
        <button v-show="!isOpen" type="button" class="btn-primary self-start md:self-auto" @click="handleOpen(NEW_USER)">
          <add-line-icon class="h-5 w-5" />
          {{ $t('user.create') }}
        </button>
      </header>

      <div v-show="!isOpen" class="rise flex flex-col gap-3 lg:flex-row lg:items-center">
        <input v-model="search" class="input lg:max-w-xs" type="search" :placeholder="$t('user.searchPlaceholder')" />
        <div class="flex flex-wrap gap-2" role="group" :aria-label="$t('user.filters.label')">
          <button
            v-for="key in USER_FILTERS"
            :key="key"
            type="button"
            class="choice-chip"
            :class="{ 'choice-chip-active': filter === key }"
            :aria-pressed="filter === key"
            @click="filter = key"
          >
            {{ $t(`user.filters.${key}`) }} <span class="text-fg-muted tabular-nums">{{ counts[key] }}</span>
          </button>
        </div>
        <ui-segmented class="self-start lg:ml-auto" variant="tabs" :model-value="view" :options="viewOptions" :label="$t('user.views.label')" @update:model-value="handleView" />
      </div>

      <ui-empty-state v-if="userStore.hasError && !userStore.users.length" class="card" tone="danger" :message="$t('user.loadError')" />

      <ui-master-detail :is-open="isOpen" :back-label="$t('user.back')" @close="handleClose">
        <template #list>
          <div v-if="userStore.isLoading && !userStore.users.length" class="flex flex-col gap-2">
            <div v-for="index in 4" :key="index" class="skeleton h-14 rounded-card" />
          </div>

          <template v-else-if="view === 'list'">
            <user-table :key="`${page}-${search}-${filter}`" :users="pageRows" :highlighted-id="lastUserId" @open="handleOpen" />

            <ui-pagination v-model:page="page" :page-count="pageCount" :total="filteredRows.length" :page-size="PAGE_SIZE" />
          </template>

          <user-teams v-else :users="filteredRows" :sites="teamSites" :highlighted-id="lastUserId" @open="handleOpen" />
        
        </template>
        <template v-if="isCreating || activeUser" #detail>
          <user-form v-if="isCreating" :key="formKey" @saved="handleSaved" @cancel="handleClose" />
          <user-detail v-else-if="activeUser" :key="activeUser.id" :user="activeUser" />
        
        </template>
      </ui-master-detail>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { usePagedRows } from 'global/composables/use-paged-rows';
import { useSiteStore } from 'site/stores/site';
import { useUserStore } from 'user/stores/user';
import { matchesFilter } from 'user/composables/filter';
import { formatFullName } from 'user/composables/format';
import { NEW_USER, PAGE_SIZE, USER_FILTERS, USER_VIEWS } from 'user/constants/user';
import type { ISite } from 'site/types/site';
import type { IStaffUser, UserFilter, UserView } from 'user/types/user';

import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import AppLayout from 'global/components/app-layout.vue';
import UserDetail from 'user/components/user-detail.vue';
import UserForm from 'user/components/user-form.vue';
import UserTable from 'user/components/user-table.vue';
import UserTeams from 'user/components/user-teams.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';

// stores
const siteStore = useSiteStore();
const userStore = useUserStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// variables
const search = ref('');
const filter = ref<UserFilter>('all');
const lastUserId = ref<string | null>(null);
const formKey = ref(0);

// computed
const scopeLabel = computed((): string => (siteStore.isAllSites ? t('user.allSites') : (siteStore.currentSite?.name ?? '')));
const viewOptions = computed(() => USER_VIEWS.map((key) => ({ key, label: t(`user.views.${key}`) })));
const view = computed((): UserView => (route.query.view === 'teams' ? 'teams' : 'list'));
const teamSites = computed((): ISite[] =>
  siteStore.isAllSites ? siteStore.accessibleSites : siteStore.accessibleSites.filter((site) => site.id === siteStore.currentSiteId),
);
const scopedRows = computed((): IStaffUser[] => {
  const siteIds = teamSites.value.map((site) => site.id);
  return userStore.users
    .filter((user) => siteIds.some((siteId) => siteId in user.sites))
    .sort((first, second) => formatFullName(first).localeCompare(formatFullName(second), 'fr'));
});
const activeCount = computed((): number => scopedRows.value.filter((user) => user.status !== 'disabled').length);
const counts = computed((): Record<UserFilter, number> =>
  Object.fromEntries(USER_FILTERS.map((key) => [key, scopedRows.value.filter((user) => matchesFilter(user, key)).length])) as Record<UserFilter, number>,
);
const filteredRows = computed((): IStaffUser[] => {
  const query = search.value.trim().toLowerCase();
  const digits = query.replace(/\D/g, '');
  return scopedRows.value.filter(
    (user) =>
      matchesFilter(user, filter.value) &&
      (formatFullName(user).toLowerCase().includes(query) ||
        (user.email ?? '').includes(query) ||
        (digits.length > 2 && (user.phone ?? '').replace(/\D/g, '').includes(digits.replace(/^0/, '')))),
  );
});
const { page, pageCount, pageRows, showRow } = usePagedRows(filteredRows, PAGE_SIZE);
const openUserId = computed((): string | null => (typeof route.query.user === 'string' ? route.query.user : null));
const isCreating = computed((): boolean => openUserId.value === NEW_USER);
const isOpen = computed((): boolean => isCreating.value || userStore.findUser(openUserId.value) !== undefined);
const activeUser = computed((): IStaffUser | undefined => (isCreating.value ? undefined : userStore.findUser(openUserId.value ?? lastUserId.value)));

// watchers
watch([search, filter, () => siteStore.currentSiteId], () => {
  page.value = 1;
});
watch(
  openUserId,
  (id) => {
    if (id === NEW_USER) formKey.value++;
    else if (id) lastUserId.value = id;
  },
  { immediate: true },
);

// methods
const showPageOf = (id: string): void => {
  const index = filteredRows.value.findIndex((user) => user.id === id);
  showRow(index);
};

// event handlers
const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, user: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleClose = (): void => {
  if (lastUserId.value) showPageOf(lastUserId.value);
  router.replace({ query: { ...route.query, user: undefined } });
};

const handleView = (key: UserView): void => {
  router.replace({ query: { ...route.query, view: key === 'list' ? undefined : key } });
};

const handleSaved = (user: IStaffUser): void => {
  search.value = '';
  filter.value = 'all';
  handleOpen(user.id);
};

// lifecycle
onMounted(() => {
  userStore.fetchUsers();
});
</script>
