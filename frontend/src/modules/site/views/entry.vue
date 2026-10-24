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

      <div class="flex min-w-0 gap-4 overflow-hidden">
        <div
          class="flex w-full shrink-0 flex-col gap-3 transition-[margin,width] duration-500 ease-(--ease-premium)"
          :class="{ '-ml-[calc(100%+1rem)] h-0': isOpen }"
        >
          <div class="card min-w-0 overflow-x-auto rounded-2xl p-0">
            <table class="w-full text-sm">
              <thead class="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase">
                <tr>
                  <th class="px-4 py-3 font-semibold">{{ $t('site.table.site') }}</th>
                  <th class="hidden px-4 py-3 font-semibold md:table-cell">{{ $t('site.table.city') }}</th>
                </tr>
              </thead>
              <tbody :key="`${page}-${search}`" class="stagger">
                <tr
                  v-for="site in pageRows"
                  :key="site.id"
                  class="cursor-pointer border-t border-neutral-100 transition-colors hover:bg-neutral-50"
                  :class="{ 'bg-primary-olive-light/40': site.id === lastSiteId }"
                  tabindex="0"
                  @click="handleOpen(site.id)"
                  @keydown.enter="handleOpen(site.id)"
                >
                  <td class="px-4 py-3">
                    <p class="flex items-center gap-2 font-medium text-neutral-900">
                      <map-pin-line-icon class="h-4 w-4 shrink-0 text-accent-rust" />
                      <span class="truncate">{{ site.name }}</span>
                    </p>
                    <p class="body-two truncate pl-6 md:hidden">{{ site.city }}</p>
                  </td>
                  <td class="hidden px-4 py-3 whitespace-nowrap text-neutral-600 md:table-cell">{{ site.city }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!filteredRows.length" class="body-two px-5 py-8 text-center">{{ $t('site.empty') }}</p>
          </div>

          <nav v-if="pageCount > 1" class="flex items-center justify-between gap-3" :aria-label="$t('site.pagination.label')">
            <p class="body-two tabular-nums">
              {{ $t('site.pagination.range', { first: firstIndex + 1, last: firstIndex + pageRows.length, total: filteredRows.length }) }}
            </p>
            <div class="flex items-center gap-1">
              <button type="button" class="icon-btn" :disabled="page === 1" :aria-label="$t('site.pagination.previous')" @click="handlePage(page - 1)">
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
              <button type="button" class="icon-btn" :disabled="page === pageCount" :aria-label="$t('site.pagination.next')" @click="handlePage(page + 1)">
                <arrow-right-line-icon class="h-4 w-4" />
              </button>
            </div>
          </nav>
        </div>

        <aside
          v-if="isCreating || activeSite"
          class="flex w-full shrink-0 flex-col gap-4 transition-opacity duration-500 ease-(--ease-premium)"
          :class="isOpen ? 'opacity-100' : 'pointer-events-none max-h-0 opacity-0'"
          :aria-hidden="!isOpen"
        >
          <button type="button" class="btn-secondary inline-flex items-center gap-2 self-start" @click="handleClose">
            <arrow-left-line-icon class="h-5 w-5" />
            {{ $t('site.back') }}
          </button>
          <div :key="activeSite?.id ?? NEW_SITE" class="stagger flex max-w-2xl flex-col gap-4">
            <header v-if="activeSite" class="flex items-center gap-3">
              <span class="avatar h-12 w-12 bg-primary-olive-dark text-white"><map-pin-line-icon class="h-6 w-6" /></span>
              <div class="min-w-0 flex-1">
                <h2 class="heading-two truncate">{{ activeSite.name }}</h2>
                <p class="body-two">{{ activeSite.city }}</p>
              </div>
            </header>

            <site-form :site="activeSite" @saved="handleSaved" @cancel="handleClose" />

            <div v-if="activeSite" class="card flex flex-col gap-3 rounded-2xl border-danger-red/30 md:flex-row md:items-center">
              <div class="min-w-0 flex-1">
                <p class="font-medium text-neutral-900">{{ $t('site.delete.title') }}</p>
                <p class="body-two">{{ $t('site.delete.hint') }}</p>
              </div>
              <button
                type="button"
                class="btn-secondary border-danger-red/40 text-danger-red hover:border-danger-red hover:bg-danger-red/5"
                :class="{ 'bg-danger-red text-white hover:bg-danger-red/90': isDeleteArmed }"
                :disabled="siteAdminStore.isSaving"
                @click="handleDelete"
              >
                {{ isDeleteArmed ? $t('site.delete.confirm') : $t('site.delete.action') }}
              </button>
            </div>
          </div>
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
import { useSiteAdminStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import type { ISite } from 'global/types/site';

import AppLayout from 'global/components/app-layout.vue';
import SiteForm from 'site/components/site-form.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';

// stores
const siteStore = useSiteStore();
const siteAdminStore = useSiteAdminStore();
const toastStore = useToastStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// variables
const PAGE_SIZE = 10;
const NEW_SITE = 'new';
const search = ref('');
const page = ref(1);
const lastSiteId = ref<string | null>(null);
const isDeleteArmed = ref(false);

// computed
const filteredRows = computed((): ISite[] => {
  const query = search.value.trim().toLowerCase();
  return siteStore.sites
    .filter((site) => site.name.toLowerCase().includes(query) || site.city.toLowerCase().includes(query))
    .sort((first, second) => first.name.localeCompare(second.name, 'fr'));
});
const pageCount = computed((): number => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)));
const firstIndex = computed((): number => (page.value - 1) * PAGE_SIZE);
const pageRows = computed((): ISite[] => filteredRows.value.slice(firstIndex.value, firstIndex.value + PAGE_SIZE));
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
watch(pageCount, (count) => {
  if (page.value > count) page.value = count;
});
watch(
  openSiteId,
  (id) => {
    isDeleteArmed.value = false;
    if (id && id !== NEW_SITE) lastSiteId.value = id;
  },
  { immediate: true },
);

// methods
const showPageOf = (id: string): void => {
  const index = filteredRows.value.findIndex((site) => site.id === id);
  if (index !== -1) page.value = Math.floor(index / PAGE_SIZE) + 1;
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

const handlePage = (number: number): void => {
  page.value = number;
};

const handleSaved = (site: ISite): void => {
  if (!isCreating.value) return;
  search.value = '';
  handleOpen(site.id);
};

const handleDelete = async (): Promise<void> => {
  if (!activeSite.value) return;
  if (!isDeleteArmed.value) {
    isDeleteArmed.value = true;
    return;
  }
  const isDeleted = await siteAdminStore.remove(activeSite.value.id);
  if (!isDeleted) {
    toastStore.push(t('site.delete.error'), 'danger');
    return;
  }
  toastStore.push(t('site.delete.deleted'), 'success');
  lastSiteId.value = null;
  handleClose();
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && isOpen.value) handleClose();
};

// lifecycle
onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>
