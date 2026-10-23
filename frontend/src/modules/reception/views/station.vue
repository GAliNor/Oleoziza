<template>
  <app-layout>
    <reception-done v-if="finishedLot" :lot="finishedLot" />

    <div v-else-if="receptionStore.isLoading && !lot" class="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div class="skeleton h-12" />
      <div class="skeleton h-48 rounded-3xl" />
    </div>

    <div v-else-if="!lot" class="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <p class="body-one">{{ $t('reception.station.notFound') }}</p>
      <router-link :to="{ name: 'dashboard' }" class="btn-secondary">{{ $t('reception.station.back') }}</router-link>
    </div>

    <section v-else class="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <nav v-if="receptionStore.receivedLots.length > 1" class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" :aria-label="$t('reception.station.otherLots')">
        <router-link
          v-for="item in receptionStore.receivedLots"
          :key="item.id"
          :to="{ name: 'reception-station', params: { code: item.code } }"
          replace
          class="flex shrink-0 flex-col rounded-2xl border px-3 py-2 transition-colors"
          :class="item.id === lot.id ? 'border-primary-olive-dark bg-primary-olive-light/50' : 'border-neutral-200 bg-white'"
        >
          <span class="text-sm font-semibold text-neutral-900">{{ item.clientName }}</span>
          <span class="text-xs text-neutral-500 tabular-nums">{{ item.code }} · {{ formatKg(item.netKg) }}</span>
        </router-link>
      </nav>

      <div class="grid gap-4 md:grid-cols-[1fr_22rem] md:items-start">
        <div class="rounded-3xl bg-primary-olive-dark p-5 text-white md:col-start-1 md:row-start-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs tracking-widest text-primary-olive-light uppercase">{{ $t('reception.station.eyebrow', { code: lot.code }) }}</p>
              <p class="truncate text-lg font-semibold">{{ lot.clientName }}</p>
              <p class="text-sm text-primary-olive-light">{{ $t(`reception.modes.${lot.mode}`) }} · {{ lot.variety }}</p>
            </div>
            <span v-if="lot.isPendingSync" class="chip shrink-0 bg-white/15 text-white">{{ $t('reception.pendingSync') }}</span>
          </div>
          <p class="mt-4 text-5xl font-semibold tabular-nums">{{ formatKg(lot.netKg) }}</p>
          <p class="text-sm text-primary-olive-light tabular-nums">
            {{ formatQuintals(lot.netKg) }} · {{ $t('reception.station.weighings', lot.weighings.length) }}
            <template v-if="lot.dailyPricePerKg !== null"> · {{ formatDh(lot.netKg * lot.dailyPricePerKg) }}</template>
          </p>
          <div v-if="lot.announcedContainers" class="mt-4">
            <div class="flex justify-between text-xs text-primary-olive-light">
              <span>{{ $t('reception.station.containersWeighed') }}</span>
              <span class="tabular-nums">{{ containersWeighed }} / {{ lot.announcedContainers }}</span>
            </div>
            <div class="mt-1 h-2 overflow-hidden rounded-full bg-white/15">
              <div class="h-full rounded-full bg-accent-gold transition-[width] duration-700 ease-(--ease-premium)" :style="{ width: `${containerProgress}%` }" />
            </div>
          </div>
        </div>

        <aside v-can="'weighing.create'" class="card flex flex-col gap-3 rounded-3xl md:sticky md:top-20 md:col-start-2 md:row-span-2 md:row-start-1">
          <div class="grid grid-cols-2 rounded-2xl bg-neutral-100 p-1">
            <button
              v-for="kind in WEIGHING_KINDS"
              :key="kind"
              type="button"
              class="min-h-11 rounded-xl text-sm font-medium transition-colors"
              :class="draft.kind === kind ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'"
              @click="draft.kind = kind"
            >
              {{ $t(`reception.station.${kind}`) }}
            </button>
          </div>

          <div class="rounded-3xl bg-neutral-900 p-5 text-white">
            <p class="text-xs tracking-widest text-neutral-400 uppercase">
              {{ $t(`reception.station.${draft.kind}`) }}
              <span v-if="draft.source === 'scale'" class="ml-1 rounded-full bg-info-blue px-2 py-0.5 normal-case">{{ $t('reception.station.scale') }}</span>
            </p>
            <p class="mt-1 text-5xl font-semibold tabular-nums">
              {{ (typedValue ?? 0).toLocaleString('fr-FR') }}<span class="ml-1 text-2xl text-neutral-400">kg</span>
            </p>
            <p class="mt-2 text-sm text-neutral-300 tabular-nums">
              <template v-if="draft.kind === 'gross'">{{ $t('reception.station.tareLine', { tare: formatKg(draftTare) }) }} </template>
              <span class="font-semibold text-white">{{ formatKg(draftNet) }} · {{ formatQuintals(draftNet) }}</span>
            </p>
          </div>

          <button v-if="draft.kind === 'gross'" type="button" class="btn-secondary min-h-14 text-base" :disabled="isReading" @click="handleReadScale">
            {{ isReading ? $t('reception.station.reading') : $t('reception.station.readScale') }}
          </button>

          <weight-pad v-model="typedValue" />

          <div class="grid grid-cols-2 gap-2">
            <container-stepper
              v-for="kind in CONTAINER_KINDS"
              :key="kind"
              v-model="draft.containers[kind]"
              :label="$t(`reception.containers.${kind}`)"
              :tare-kg="receptionStore.settings?.containerTareKg[kind] ?? 0"
            />
          </div>
          <p v-if="isTareOverGross(draft, receptionStore.settings)" class="form-error">{{ $t('reception.station.tareOverGross') }}</p>

          <button type="button" class="btn-primary min-h-16 text-base" :disabled="!canAdd" @click="handleAddWeighing">
            {{ $t('reception.station.add') }}
          </button>
          <div class="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3">
            <router-link :to="{ name: 'dashboard' }" class="btn-secondary">{{ $t('reception.station.later') }}</router-link>
            <button
              v-can="'reception.create'"
              type="button"
              class="btn-secondary border-primary-olive-dark text-primary-olive-dark"
              :disabled="!lot.weighings.length || receptionStore.isSaving"
              :title="$t('reception.station.finishHint')"
              @click="handleFinish"
            >
              {{ $t('reception.station.finish') }}
            </button>
          </div>
        </aside>

        <ol class="flex flex-col gap-2 md:col-start-1 md:row-start-2">
          <li
            v-for="(weighing, index) in reversedWeighings"
            :key="weighing.id"
            class="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3"
            :class="{ rise: index === 0 }"
          >
            <span class="avatar h-9 w-9 bg-neutral-100 text-neutral-700">{{ lot.weighings.length - index }}</span>
            <span class="min-w-0 flex-1 text-sm text-neutral-500">
              {{ formatTime(weighing.recordedAt) }} · {{ weighing.source === 'scale' ? $t('reception.station.scale') : $t('reception.station.manual') }}
              <template v-if="weighing.kind === 'gross' && weighing.grossKg !== null">
                · {{ $t('reception.station.grossHint', { gross: formatKg(weighing.grossKg), tare: formatKg(weighing.grossKg - weighing.netKg) }) }}
              </template>
              <span class="block text-xs text-neutral-400">{{ weighing.recordedBy }}</span>
            </span>
            <span class="flex flex-col items-end gap-1">
              <span class="font-semibold text-neutral-900 tabular-nums">{{ formatKg(weighing.netKg) }}</span>
              <span v-if="weighing.isPendingSync" class="chip bg-warning-amber/15 text-warning-amber">{{ $t('reception.pendingSync') }}</span>
            </span>
          </li>
          <li v-if="!lot.weighings.length" class="body-two rounded-2xl border border-dashed border-neutral-300 p-6 text-center">
            {{ $t('reception.station.noWeighing') }}
          </li>
        </ol>
      </div>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { useSiteStore } from 'global/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useReceptionStore } from 'reception/stores/reception';
import { formatDh, formatKg, formatQuintals, formatTime } from 'reception/composables/format';
import { createWeighingDraft, draftNetKg, isDraftValid, isTareOverGross, tareKg, weighedContainers } from 'reception/composables/weighing';
import { CONTAINER_KINDS } from 'reception/constants/reception';
import type { ILot, IWeighingDraft, WeighingKind } from 'reception/types/reception';

import AppLayout from 'global/components/app-layout.vue';
import ContainerStepper from 'reception/components/container-stepper.vue';
import ReceptionDone from 'reception/components/reception-done.vue';
import WeightPad from 'reception/components/weight-pad.vue';

// stores
const { t } = useI18n();
const route = useRoute();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const receptionStore = useReceptionStore();

// variables
const WEIGHING_KINDS: WeighingKind[] = ['gross', 'net'];
const draft = ref<IWeighingDraft>(createWeighingDraft());
const isReading = ref(false);
const finishedLot = ref<ILot | null>(null);

// computed
const siteId = computed((): string => siteStore.currentSite?.id ?? '');
const lot = computed((): ILot | undefined => {
  const found = receptionStore.lotByCode(String(route.params.code));
  return found?.status === 'received' ? found : undefined;
});
const reversedWeighings = computed(() => [...(lot.value?.weighings ?? [])].reverse());
const containersWeighed = computed((): number => (lot.value ? weighedContainers(lot.value) : 0));
const containerProgress = computed((): number =>
  Math.min(100, (containersWeighed.value / (lot.value?.announcedContainers || 1)) * 100),
);
const draftTare = computed((): number => tareKg(draft.value.containers, receptionStore.settings));
const draftNet = computed((): number => draftNetKg(draft.value, receptionStore.settings));
const canAdd = computed((): boolean => isDraftValid(draft.value, receptionStore.settings) && !receptionStore.isSaving);
const typedValue = computed({
  get: (): number | null => (draft.value.kind === 'gross' ? draft.value.grossKg : draft.value.netKgTyped),
  set: (value: number | null): void => {
    if (draft.value.kind === 'gross') {
      draft.value.grossKg = value;
      draft.value.source = 'manual';
    } else draft.value.netKgTyped = value;
  },
});

// watchers
watch(
  siteId,
  (value) => {
    if (value) receptionStore.fetchSite(value);
  },
  { immediate: true },
);

watch(
  () => route.params.code,
  () => {
    draft.value = createWeighingDraft(draft.value.kind);
    finishedLot.value = null;
  },
);

// event handlers
const handleReadScale = async (): Promise<void> => {
  isReading.value = true;
  const grossKg = await receptionStore.readScale(siteId.value);
  isReading.value = false;
  if (grossKg === null) {
    toastStore.push(t('reception.station.scaleError'), 'danger');
    return;
  }
  draft.value.grossKg = grossKg;
  draft.value.source = 'scale';
};

const handleAddWeighing = async (): Promise<void> => {
  if (!lot.value) return;
  const updated = await receptionStore.addWeighing(lot.value, draft.value);
  if (!updated) {
    toastStore.push(t('reception.saveError'), 'danger');
    return;
  }
  const last = updated.weighings[updated.weighings.length - 1];
  toastStore.push(t('reception.station.added', { index: updated.weighings.length, net: formatKg(last.netKg) }), 'success');
  draft.value = createWeighingDraft(draft.value.kind);
};

const handleFinish = async (): Promise<void> => {
  if (!lot.value) return;
  const updated = await receptionStore.finishReception(lot.value);
  if (!updated) {
    toastStore.push(t('reception.saveError'), 'danger');
    return;
  }
  finishedLot.value = updated;
};
</script>
