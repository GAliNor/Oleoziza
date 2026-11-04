<template>
  <app-layout>
    <div class="mx-auto flex w-full max-w-lg flex-col gap-5">
      <p class="eyebrow rise">{{ $t('reception.open.eyebrow', { site: siteName }) }}</p>
      <ui-segmented v-if="!isFinished && tabOptions.length > 1" class="rise" variant="strong-pills" is-full :model-value="tab" :options="tabOptions" :label="$t('reception.tabs.label')" @update:model-value="handleTab" />

      <div class="-mx-2 grid min-w-0 overflow-x-clip px-2">
        <Transition :name="paneTransition">
          <div v-show="tab === 'reception'" class="col-start-1 row-start-1 min-w-0" :inert="tab !== 'reception'">
            <reception-form @create-client="handleCreateClient" @finished="isFinished = $event" />
          </div>
        </Transition>
        <Transition :name="paneTransition">
          <div v-show="tab === 'client'" class="col-start-1 row-start-1 min-w-0" :inert="tab !== 'client'">
            <quick-client-form :prefill="clientPrefill" :returns-on-create="returnsOnCreate" :is-active="tab === 'client'" @receive="handleReceive" @later="handleLater" />
          </div>
        </Transition>
      </div>
    </div>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useSiteStore } from 'site/stores/site';

import AppLayout from 'global/components/app-layout.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import QuickClientForm from 'client/components/quick-client-form.vue';
import ReceptionForm from 'reception/components/reception-form.vue';

// stores
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const siteStore = useSiteStore();

// variables
type ArrivalTab = 'reception' | 'client';
const paneTransition = ref('pane-forward');
const isFinished = ref(false);
const returnsOnCreate = ref(false);
const clientPrefill = ref(typeof route.query.name === 'string' ? route.query.name : '');

// computed
const siteName = computed((): string => siteStore.currentSite?.city ?? '');
const tabOptions = computed((): { key: ArrivalTab; label: string }[] => [
  ...(siteStore.can('reception.create') ? [{ key: 'reception' as const, label: t('reception.tabs.reception') }] : []),
  ...(siteStore.can('client.create') ? [{ key: 'client' as const, label: t('reception.tabs.client') }] : []),
]);
const tab = computed((): ArrivalTab => {
  const wanted = route.query.tab === 'client' ? 'client' : 'reception';
  return tabOptions.value.some((option) => option.key === wanted) ? wanted : (tabOptions.value[0]?.key ?? 'reception');
});

// methods
const showTab = (next: ArrivalTab, query: Record<string, string | undefined> = {}): void => {
  paneTransition.value = next === 'client' ? 'pane-forward' : 'pane-back';
  router.replace({ query: { ...route.query, name: undefined, tab: next === 'client' ? 'client' : undefined, ...query } });
};

// event handlers
const handleTab = (next: ArrivalTab): void => {
  returnsOnCreate.value = false;
  showTab(next);
};

const handleCreateClient = (query: string): void => {
  clientPrefill.value = query;
  returnsOnCreate.value = true;
  showTab('client');
};

const handleReceive = (clientId: string): void => {
  returnsOnCreate.value = false;
  clientPrefill.value = '';
  showTab('reception', { client: clientId });
};

const handleLater = (): void => {
  router.push({ name: 'dashboard' });
};
</script>
