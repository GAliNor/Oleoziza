<template>
  <app-layout>
    <section class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
      <header class="rise flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="flex flex-col gap-1">
          <h1 class="heading-one">{{ $t('site.title') }}</h1>
          <p class="body-two">{{ $t('site.subtitle') }} · {{ $t('site.count', siteStore.sites.length) }}</p>
        </div>
        <button v-show="!isOpen" type="button" class="btn-primary self-start md:self-auto" @click="handleOpen(NEW_SITE)">
          <add-line-icon class="h-5 w-5" />
          {{ $t('site.create') }}
        </button>
      </header>

      <div v-show="!isOpen" class="rise flex flex-col gap-3 md:flex-row md:items-center">
        <input v-model="search" class="input md:max-w-xs" type="search" :placeholder="$t('site.searchPlaceholder')" />
      </div>

      <ui-master-detail :is-open="isOpen" :back-label="$t('site.back')" @close="handleClose">
        <template #list>
          <div class="table-card">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="px-4 py-3 font-semibold">{{ $t('site.table.site') }}</th>
                  <th class="hidden px-4 py-3 font-semibold md:table-cell">{{ $t('site.table.city') }}</th>
                </tr>
              </thead>
              <tbody :key="`${page}-${search}`" class="stagger">
                <tr
                  v-for="site in pageRows"
                  :key="site.id"
                  class="data-row"
                  :class="{ 'bg-selected/40': site.id === lastSiteId }"
                  tabindex="0"
                  @click="handleOpen(site.id)"
                  @keydown.enter="handleOpen(site.id)"
                >
                  <td class="px-4 py-3">
                    <p class="flex items-center gap-2 font-medium text-fg-display">
                      <map-pin-line-icon class="h-4 w-4 shrink-0 text-fg-place" />
                      <span class="truncate">{{ site.name }}</span>
                    </p>
                    <p class="body-two truncate pl-6 md:hidden">{{ site.city }}</p>
                  </td>
                  <td class="hidden px-4 py-3 whitespace-nowrap text-fg-primary-paragraph md:table-cell">{{ site.city }}</td>
                </tr>
              </tbody>
            </table>
            <ui-empty-state v-if="!filteredRows.length" :message="$t('site.empty')" />
          </div>

          <ui-pagination v-model:page="page" :page-count="pageCount" :total="filteredRows.length" :page-size="PAGE_SIZE" />
        
        </template>
        <template v-if="isCreating || activeSite" #detail>
          <div :key="activeSite?.id ?? NEW_SITE" class="stagger flex max-w-2xl flex-col gap-4">
            <header v-if="activeSite" class="flex items-center gap-3">
              <span class="round-badge h-12 w-12 bg-action text-fg-on-action"><map-pin-line-icon class="h-6 w-6" /></span>
              <div class="min-w-0 flex-1">
                <h2 class="heading-four truncate">{{ activeSite.name }}</h2>
                <p class="body-two">{{ activeSite.city }}</p>
              </div>
            </header>

            <site-form :site="activeSite" @saved="handleSaved" @cancel="handleClose" />

            <div v-if="activeSite" class="card flex flex-col gap-3 rounded-2xl border-danger-subtle md:flex-row md:items-center">
              <div class="min-w-0 flex-1">
                <p class="font-medium text-fg-display">{{ $t('site.delete.title') }}</p>
                <p class="body-two">{{ $t('site.delete.hint') }}</p>
              </div>
              <ui-confirm-button :label="$t('site.delete.action')" :confirm-label="$t('site.delete.confirm')" :is-disabled="siteStore.isSaving" @confirm="handleDelete" />
            </div>
          </div>
        
        </template>
      </ui-master-detail>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { usePagedRows } from 'global/composables/use-paged-rows';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import type { ISite } from 'site/types/site';

import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import AppLayout from 'global/components/app-layout.vue';
import SiteForm from 'site/components/site-form.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';

// stores
const siteStore = useSiteStore();
const toastStore = useToastStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// variables
const PAGE_SIZE = 10;
const NEW_SITE = 'new';
const search = ref('');
const lastSiteId = ref<string | null>(null);

// computed
const filteredRows = computed((): ISite[] => {
  const query = search.value.trim().toLowerCase();
  return siteStore.sites
    .filter((site) => site.name.toLowerCase().includes(query) || site.city.toLowerCase().includes(query))
    .sort((first, second) => first.name.localeCompare(second.name, 'fr'));
});
const { page, pageCount, pageRows, showRow } = usePagedRows(filteredRows, PAGE_SIZE);
const openSiteId = computed((): string | null => (typeof route.query.site === 'string' ? route.query.site : null));
const isCreating = computed((): boolean => openSiteId.value === NEW_SITE);
const isOpen = computed((): boolean => isCreating.value || siteStore.sites.some((site) => site.id === openSiteId.value));
const activeSite = computed((): ISite | undefined => {
  if (isCreating.value) return undefined;
  return siteStore.sites.find((site) => site.id === (openSiteId.value ?? lastSiteId.value));
});

// watchers
watch(search, () => {
  page.value = 1;
});
watch(
  openSiteId,
  (id) => {
    if (id && id !== NEW_SITE) lastSiteId.value = id;
  },
  { immediate: true },
);

// methods
const showPageOf = (id: string): void => {
  const index = filteredRows.value.findIndex((site) => site.id === id);
  showRow(index);
};

// event handlers
const handleOpen = (id: string): void => {
  router.replace({ query: { ...route.query, site: id } });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleClose = (): void => {
  if (lastSiteId.value) showPageOf(lastSiteId.value);
  router.replace({ query: { ...route.query, site: undefined } });
};

const handleSaved = (site: ISite): void => {
  if (!isCreating.value) return;
  search.value = '';
  handleOpen(site.id);
};

const handleDelete = async (): Promise<void> => {
  if (!activeSite.value) return;
  const isDeleted = await siteStore.remove(activeSite.value.id);
  if (!isDeleted) {
    toastStore.push(t('site.delete.error'), 'danger');
    return;
  }
  toastStore.push(t('site.delete.deleted'), 'success');
  lastSiteId.value = null;
  handleClose();
};
</script>
