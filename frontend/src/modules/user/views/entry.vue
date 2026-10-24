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
            {{ $t(`user.filters.${key}`) }} <span class="text-neutral-400 tabular-nums">{{ counts[key] }}</span>
          </button>
        </div>
        <div class="inline-flex self-start rounded-xl bg-neutral-100 p-1 lg:ml-auto" role="radiogroup" :aria-label="$t('user.views.label')">
          <button
            v-for="key in USER_VIEWS"
            :key="key"
            type="button"
            role="radio"
            :aria-checked="view === key"
            class="min-h-10 rounded-lg px-4 text-sm font-medium transition-colors duration-300 ease-(--ease-premium)"
            :class="view === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'"
            @click="handleView(key)"
          >
            {{ $t(`user.views.${key}`) }}
          </button>
        </div>
      </div>

      <p v-if="userStore.hasError && !userStore.users.length" class="card body-two text-danger-red">{{ $t('user.loadError') }}</p>

      <div class="flex min-w-0 gap-4 overflow-hidden">
        <div
          class="flex w-full shrink-0 flex-col gap-3 transition-[margin,width] duration-500 ease-(--ease-premium)"
          :class="{ '-ml-[calc(100%+1rem)] h-0': isOpen }"
        >
          <div v-if="userStore.isLoading && !userStore.users.length" class="flex flex-col gap-2">
            <div v-for="index in 4" :key="index" class="skeleton h-14 rounded-xl" />
          </div>

          <template v-else-if="view === 'list'">
            <user-table :key="`${page}-${search}-${filter}`" :users="pageRows" :highlighted-id="lastUserId" @open="handleOpen" />

            <nav v-if="pageCount > 1" class="flex items-center justify-between gap-3" :aria-label="$t('user.pagination.label')">
              <p class="body-two tabular-nums">
                {{ $t('user.pagination.range', { first: firstIndex + 1, last: firstIndex + pageRows.length, total: filteredRows.length }) }}
              </p>
              <div class="flex items-center gap-1">
                <button type="button" class="icon-btn" :disabled="page === 1" :aria-label="$t('user.pagination.previous')" @click="handlePage(page - 1)">
                  <arrow-left-line-icon class="h-4 w-4" />
                </button>
                <button
                  v-for="number in pageCount"
                  :key="number"
                  type="button"
                  class="h-9 min-w-9 rounded-lg px-2 text-sm tabular-nums transition-colors"
                  :class="number === page ? 'bg-primary-olive-dark text-white' : 'text-neutral-600 hover:bg-neutral-100'"
                  :aria-current="number === page ? 'page' : undefined"
                  @click="handlePage(number)"
                >
                  {{ number }}
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  :disabled="page === pageCount"
                  :aria-label="$t('user.pagination.next')"
                  @click="handlePage(page + 1)"
                >
                  <arrow-right-line-icon class="h-4 w-4" />
                </button>
              </div>
            </nav>
          </template>

          <user-teams v-else :users="filteredRows" :sites="teamSites" :highlighted-id="lastUserId" @open="handleOpen" />
        </div>

        <aside
          v-if="isCreating || activeUser"
          class="flex w-full shrink-0 flex-col gap-4 transition-opacity duration-500 ease-(--ease-premium)"
          :class="isOpen ? 'opacity-100' : 'pointer-events-none max-h-0 opacity-0'"
          :aria-hidden="!isOpen"
        >
          <button type="button" class="btn-secondary inline-flex items-center gap-2 self-start" @click="handleClose">
            <arrow-left-line-icon class="h-5 w-5" />
            {{ $t('user.back') }}
          </button>
          <user-form v-if="isCreating" :key="formKey" @saved="handleSaved" @cancel="handleClose" />
          <user-detail v-else-if="activeUser" :key="activeUser.id" :user="activeUser" />
        </aside>
      </div>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useSiteStore } from 'global/stores/site';
import { useUserStore } from 'user/stores/user';
import { formatFullName } from 'user/composables/format';
import { NEW_USER, PAGE_SIZE, USER_FILTERS, USER_VIEWS } from 'user/constants/user';
import type { ISite } from 'global/types/site';
import type { IStaffUser, UserFilter, UserView } from 'user/types/user';

import AppLayout from 'global/components/app-layout.vue';
import UserDetail from 'user/components/user-detail.vue';
import UserForm from 'user/components/user-form.vue';
import UserTable from 'user/components/user-table.vue';
import UserTeams from 'user/components/user-teams.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// stores
const siteStore = useSiteStore();
const userStore = useUserStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// variables
const search = ref('');
const filter = ref<UserFilter>('all');
const page = ref(1);
const lastUserId = ref<string | null>(null);
const formKey = ref(0);

// computed
const scopeLabel = computed((): string => (siteStore.isAllSites ? t('user.allSites') : (siteStore.currentSite?.name ?? '')));
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
const pageCount = computed((): number => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)));
const firstIndex = computed((): number => (page.value - 1) * PAGE_SIZE);
const pageRows = computed((): IStaffUser[] => filteredRows.value.slice(firstIndex.value, firstIndex.value + PAGE_SIZE));
const openUserId = computed((): string | null => (typeof route.query.user === 'string' ? route.query.user : null));
const isCreating = computed((): boolean => openUserId.value === NEW_USER);
const isOpen = computed((): boolean => isCreating.value || userStore.findUser(openUserId.value) !== undefined);
const activeUser = computed((): IStaffUser | undefined => (isCreating.value ? undefined : userStore.findUser(openUserId.value ?? lastUserId.value)));

// watchers
watch([search, filter, () => siteStore.currentSiteId], () => {
  page.value = 1;
});
watch(pageCount, (count) => {
  if (page.value > count) page.value = count;
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
const matchesFilter = (user: IStaffUser, key: UserFilter): boolean => {
  if (key === 'management' || key === 'operator') return user.role === key && user.status !== 'disabled';
  if (key === 'invited' || key === 'disabled') return user.status === key;
  return user.status !== 'disabled';
};

const showPageOf = (id: string): void => {
  const index = filteredRows.value.findIndex((user) => user.id === id);
  if (index !== -1) page.value = Math.floor(index / PAGE_SIZE) + 1;
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

const handlePage = (number: number): void => {
  page.value = number;
};

const handleSaved = (user: IStaffUser): void => {
  search.value = '';
  filter.value = 'all';
  handleOpen(user.id);
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && isOpen.value) handleClose();
};

// lifecycle
onMounted(() => {
  userStore.fetchUsers();
  window.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>
