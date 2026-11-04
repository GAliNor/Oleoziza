<template>
  <aside v-can="'weighing.create'" class="card flex flex-col gap-3 rounded-card md:sticky md:top-20 md:col-start-2 md:row-span-2 md:row-start-1">
    <ui-segmented v-model="draft.kind" variant="tabs" is-full :options="weighingKinds" :label="$t('reception.station.kindLabel')" />

    <div class="rounded-card bg-neutral-900 p-5 text-white">
      <p class="eyebrow text-sm text-neutral-400">
        {{ $t(`reception.station.${draft.kind}`) }}
        <span v-if="draft.source === 'scale'" class="ml-1 rounded-full bg-info-blue px-2 py-0.5 normal-case">{{ $t('reception.station.scale') }}</span>
      </p>
      <p class="mt-1 text-display-lg figure">
        {{ formatNumber(typedValue ?? 0, 1) }}<span class="ml-1 text-display-xs text-neutral-400">{{ $t('global.units.kilogram') }}</span>
      </p>
      <p class="mt-2 body-two text-neutral-300 tabular-nums">
        <template v-if="draft.kind === 'gross'">{{ $t('reception.station.tareLine', { tare: formatKg(tare) }) }} </template>
        <span class="font-semibold text-white">{{ formatKg(net) }} · {{ formatQuintals(net) }}</span>
      </p>
    </div>

    <button v-if="draft.kind === 'gross'" type="button" class="btn-secondary min-h-14 text-md" :disabled="isReading" @click="handleReadScale">
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
    <p v-if="isTareTooHigh" class="form-error">{{ $t('reception.station.tareOverGross') }}</p>

    <button type="button" class="btn-primary min-h-16 text-md" :disabled="!isValid || receptionStore.isSaving" @click="handleAddWeighing">
      {{ $t('reception.station.add') }}
    </button>
    <div class="grid grid-cols-2 gap-2 border-t border-subtle pt-3">
      <router-link :to="{ name: 'dashboard' }" class="btn-secondary">{{ $t('reception.station.later') }}</router-link>
      <button
        v-can="'reception.create'"
        type="button"
        class="btn-secondary border-brand text-fg-brand"
        :disabled="!lot.weighings.length || receptionStore.isSaving"
        :title="$t('reception.station.finishHint')"
        @click="emit('finish')"
      >
        {{ $t('reception.station.finish') }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useReceptionStore } from 'reception/stores/reception';
import { useToastStore } from 'global/stores/toast';
import { useWeighingDraft } from 'reception/composables/use-weighing-draft';
import { formatNumber } from 'global/composables/number';
import { formatKg, formatQuintals } from 'lot/composables/quantity';
import { CONTAINER_KINDS } from 'reception/constants/reception';
import type { ILot, WeighingKind } from 'lot/types/lot';

import UiSegmented from 'global/components/ui-segmented.vue';
import ContainerStepper from 'reception/components/container-stepper.vue';
import WeightPad from 'reception/components/weight-pad.vue';

// props
const props = defineProps<{ lot: ILot; siteId: string }>();

// emits
const emit = defineEmits<{ (event: 'finish'): void }>();

// stores
const { t } = useI18n();
const receptionStore = useReceptionStore();
const toastStore = useToastStore();
const { draft, typedValue, tare, net, isValid, isTareTooHigh, setScaleReading, reset } = useWeighingDraft(() => receptionStore.settings);

// variables
const isReading = ref(false);

// computed
const weighingKinds = computed((): { key: WeighingKind; label: string }[] => [
  { key: 'gross', label: t('reception.station.gross') },
  { key: 'net', label: t('reception.station.net') },
]);

// watchers
watch(() => props.lot.code, reset);

// event handlers
const handleReadScale = async (): Promise<void> => {
  isReading.value = true;
  const grossKg = await receptionStore.readScale(props.siteId);
  isReading.value = false;
  if (grossKg === null) {
    toastStore.push(t('reception.station.scaleError'), 'danger');
    return;
  }
  setScaleReading(grossKg);
};

const handleAddWeighing = async (): Promise<void> => {
  const updated = await receptionStore.addWeighing(props.lot, draft.value);
  if (!updated) {
    toastStore.push(t('reception.saveError'), 'danger');
    return;
  }
  const last = updated.weighings[updated.weighings.length - 1];
  toastStore.push(t('reception.station.added', { index: updated.weighings.length, net: formatKg(last.netKg) }), 'success');
  reset();
};
</script>
