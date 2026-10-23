<template>
  <app-layout>
    <form class="mx-auto flex w-full max-w-lg flex-col gap-5" @submit.prevent>
      <header class="rise">
        <p class="eyebrow">{{ $t('reception.open.eyebrow', { site: siteName }) }}</p>
        <h1 class="heading-one">{{ $t('reception.open.title') }}</h1>
        <p class="body-two">{{ $t('reception.open.subtitle') }}</p>
      </header>

      <div v-if="receptionStore.hasError" class="card flex items-center justify-between gap-3">
        <p class="form-error">{{ $t('reception.loadError') }}</p>
        <button type="button" class="btn-secondary" @click="handleRetry">{{ $t('reception.retry') }}</button>
      </div>

      <section class="flex flex-col gap-2">
        <h2 class="label">{{ $t('reception.open.client') }}</h2>
        <div v-if="receptionStore.isLoading" class="skeleton h-14" />
        <client-picker v-else v-model="client" :site-id="siteId" />
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="label">{{ $t('reception.open.mode') }}</h2>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="option in modeOptions"
            :key="option"
            type="button"
            class="toggle-tile min-h-14"
            :class="{ 'toggle-tile-active': mode === option }"
            @click="mode = option"
          >
            {{ $t(`reception.modes.${option}`) }}
          </button>
        </div>
        <p v-if="mode === 'purchase'" class="rounded-xl bg-accent-sand/20 px-3 py-2 text-sm text-accent-brown">
          {{ dailyPrice === null ? $t('reception.open.dailyPriceMissing') : $t('reception.open.dailyPrice', { price: formatDh(dailyPrice) }) }}
        </p>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="label">{{ $t('reception.open.variety') }}</h2>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in VARIETIES"
            :key="option"
            type="button"
            class="choice-chip"
            :class="{ 'choice-chip-active': variety === option }"
            @click="variety = option"
          >
            {{ option }}
          </button>
        </div>
      </section>

      <details class="card group">
        <summary class="label flex cursor-pointer list-none items-center justify-between">
          <span>{{ $t('reception.open.details') }} <span class="font-normal text-neutral-500">({{ $t('reception.open.optional') }})</span></span>
          <chevron-down-line-icon class="h-5 w-5 transition-transform group-open:rotate-180" />
        </summary>
        <div class="mt-4 flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1">
              <span class="body-two">{{ $t('reception.open.announcedContainers') }}</span>
              <input
                v-model.number="announcedContainers"
                class="input"
                type="number"
                inputmode="numeric"
                min="0"
                :placeholder="$t('reception.open.announcedPlaceholder')"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="body-two">{{ $t('reception.open.plate') }}</span>
              <input v-model="plate" class="input" :placeholder="$t('reception.open.platePlaceholder')" />
            </label>
          </div>
          <label class="flex flex-col gap-1">
            <span class="body-two">{{ $t('reception.open.origin') }}</span>
            <input v-model="origin" class="input" list="reception-origins" :placeholder="$t('reception.open.originPlaceholder')" />
            <datalist id="reception-origins">
              <option v-for="suggestion in ORIGIN_SUGGESTIONS" :key="suggestion" :value="suggestion" />
            </datalist>
          </label>
          <div class="flex flex-col gap-1">
            <span class="body-two">{{ $t('reception.open.qualityLabel') }}</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="tag in QUALITY_TAGS"
                :key="tag"
                type="button"
                class="choice-chip"
                :class="{ 'choice-chip-active': quality.includes(tag) }"
                @click="handleToggleQuality(tag)"
              >
                {{ $t(`reception.quality.${tag}`) }}
              </button>
            </div>
          </div>
          <textarea v-model="note" class="input min-h-20 py-3" :placeholder="$t('reception.open.note')" />
        </div>
      </details>

      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn-secondary min-h-14" :disabled="!canOpen" @click="handleOpen(false)">
          {{ $t('reception.open.weighLater') }}
        </button>
        <button type="button" class="btn-primary min-h-14" :disabled="!canOpen" @click="handleOpen(true)">
          {{ $t('reception.open.weighNow') }}
        </button>
      </div>
    </form>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useReceptionStore } from 'reception/stores/reception';
import { useClientStore } from 'global/stores/client';
import { formatDh } from 'reception/composables/format';
import { ORIGIN_SUGGESTIONS, QUALITY_TAGS, RECEPTION_MODES, VARIETIES } from 'reception/constants/reception';
import type { IClient } from 'global/types/client';
import type { ReceptionMode } from 'reception/types/reception';

import AppLayout from 'global/components/app-layout.vue';
import ChevronDownLineIcon from 'global/icons/chevron-down-line.icon.vue';
import ClientPicker from 'reception/components/client-picker.vue';

// stores
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const receptionStore = useReceptionStore();
const clientStore = useClientStore();

// variables
const client = ref<IClient | null>(null);
const mode = ref<ReceptionMode>('service');
const variety = ref(VARIETIES[0]);
const announcedContainers = ref<number | null>(null);
const plate = ref('');
const origin = ref('');
const quality = ref<string[]>([]);
const note = ref('');

// computed
const siteId = computed((): string => siteStore.currentSite?.id ?? '');
const siteName = computed((): string => siteStore.currentSite?.city ?? '');
const modeOptions = computed((): ReceptionMode[] =>
  RECEPTION_MODES.filter((option) => option !== 'purchase' || authStore.can('purchase.create')),
);
const dailyPrice = computed((): number | null => receptionStore.settings?.dailyPricePerKg ?? null);
const canOpen = computed((): boolean => !!client.value && !!siteId.value && !receptionStore.isSaving);

// watchers
watch(
  siteId,
  (value) => {
    if (value) receptionStore.fetchSite(value);
  },
  { immediate: true },
);

watch(
  () => clientStore.clients,
  (clients) => {
    if (!client.value && route.query.client) client.value = clients.find((item) => item.id === route.query.client) ?? null;
  },
  { immediate: true },
);

// event handlers
const handleRetry = (): void => {
  receptionStore.fetchSite(siteId.value, true);
};

const handleToggleQuality = (tag: string): void => {
  quality.value = quality.value.includes(tag) ? quality.value.filter((item) => item !== tag) : [...quality.value, tag];
};

const handleOpen = async (isWeighingNow: boolean): Promise<void> => {
  if (!client.value) return;
  const lot = await receptionStore.openReception({
    siteId: siteId.value,
    clientId: client.value.id,
    mode: mode.value,
    variety: variety.value,
    announcedContainers: announcedContainers.value || null,
    plate: plate.value.trim(),
    origin: origin.value.trim(),
    quality: quality.value,
    note: note.value.trim(),
  });
  if (!lot) {
    toastStore.push(t('reception.saveError'), 'danger');
    return;
  }
  toastStore.push(t('reception.open.opened', { code: lot.code, client: lot.clientName }), 'success');
  if (isWeighingNow) router.push({ name: 'reception-station', params: { code: lot.code } });
  else router.push({ name: 'dashboard' });
};
</script>
