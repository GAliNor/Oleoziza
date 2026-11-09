<template>
  <section class="flex flex-col gap-3">
    <ui-segmented v-if="!isPurchase" :model-value="mode" :options="modeOptions" :label="$t('lot.split.label')" @update:model-value="handleMode" />
    <p v-else class="rounded-control bg-accent-subtle p-3 body-two text-fg-accent">{{ $t('lot.split.purchase') }}</p>

    <template v-if="mode === 'store'">
      <ui-field v-if="!isPurchase" v-slot="{ id }" :label="$t('lot.split.handed')">
        <input :id="id" v-model.number="handedTyped" class="input figure" type="number" inputmode="decimal" min="0" :max="oilLitres" step="0.1" />
      </ui-field>
      <p class="label">{{ $t('lot.split.toStore', { quantity: formatLitres(toStore) }) }}</p>

      <ul class="flex flex-col gap-2">
        <li v-for="(pour, index) in pours" :key="index" class="flex items-center gap-2">
          <select v-model="pour.tankId" class="input min-w-0 flex-1" :aria-label="$t('lot.split.tank', { index: index + 1 })">
            <option v-for="state in states" :key="state.tank.id" :value="state.tank.id" :disabled="!canTake(state, lot.variety)">{{ tankOption(state) }}</option>
          </select>
          <div class="relative w-32 shrink-0">
            <input v-model.number="pour.litres" class="input pe-8 figure" type="number" inputmode="decimal" min="0" step="0.1" :aria-label="$t('lot.split.litres', { index: index + 1 })" />
            <span class="pointer-events-none absolute top-1/2 inset-e-3 -translate-y-1/2 body-two">{{ $t('global.units.litre') }}</span>
          </div>
          <button type="button" class="icon-btn shrink-0" :aria-label="$t('lot.split.removeTank', { index: index + 1 })" @click="pours.splice(index, 1)">
            <close-line-icon class="h-5 w-5" />
          </button>
        </li>
      </ul>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-secondary" @click="handleAddTank">
          <add-line-icon class="h-5 w-5" />
          {{ $t('lot.split.addTank') }}
        </button>
        <button type="button" class="link" @click="suggest">{{ $t('lot.split.suggest') }}</button>
      </div>

      <ui-field v-slot="{ id }" :label="$t('lot.split.plannedUntil')">
        <input :id="id" v-model="plannedUntil" class="input" type="date" :min="todayIso()" />
      </ui-field>
      <p v-if="problem" class="form-error" role="alert">{{ $t(`lot.split.problems.${problem}`, { quantity: formatLitres(toStore) }) }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { todayIso } from 'global/composables/date';
import { formatTank } from 'configuration/composables/equipment';
import { formatLitres, formatLitresRounded } from 'lot/composables/quantity';
import { canTake, checkPours, suggestPours, tankStates, type ITankState, type PourProblem } from 'lot/composables/storage';
import type { ITankSetting } from 'configuration/types/configuration';
import type { ILot, IOilSplit, ITankPour } from 'lot/types/lot';

import UiField from 'global/components/ui-field.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import CloseLineIcon from 'global/icons/close-line.icon.vue';

type SplitMode = 'hand' | 'store';

// props
const props = defineProps<{ lot: ILot; oilLitres: number; tanks: ITankSetting[]; lots: ILot[] }>();

// emits
const emit = defineEmits<{ (event: 'change', split: IOilSplit): void }>();

// stores
const { t } = useI18n();

// variables
const isPurchase = props.lot.mode === 'purchase';
const mode = ref<SplitMode>(isPurchase ? 'store' : 'hand');
const handedTyped = ref<number | ''>(0);
const pours = ref<ITankPour[]>([]);
const plannedUntil = ref('');

// computed
const modeOptions = computed((): { key: SplitMode; label: string }[] => [
  { key: 'hand', label: t('lot.split.handAll') },
  { key: 'store', label: t('lot.split.store') },
]);
const states = computed((): ITankState[] => tankStates(props.tanks, props.lots.filter((other) => other.id !== props.lot.id)));
const handedLitres = computed((): number => (mode.value === 'hand' ? props.oilLitres : typeof handedTyped.value === 'number' ? handedTyped.value : 0));
const toStore = computed((): number => Math.max(Math.round((props.oilLitres - handedLitres.value) * 10) / 10, 0));
const shownPours = computed((): ITankPour[] => (mode.value === 'hand' ? [] : pours.value.filter((pour) => pour.tankId)));
const problem = computed((): PourProblem | null => (props.oilLitres > 0 ? checkPours(states.value, props.lot, props.oilLitres, handedLitres.value, shownPours.value) : 'total'));

// watchers
watch(
  [handedLitres, shownPours, plannedUntil, problem],
  () => emit('change', { handedLitres: handedLitres.value, pours: shownPours.value.map((pour) => ({ ...pour })), plannedUntil: plannedUntil.value || null, isValid: !problem.value }),
  { deep: true, immediate: true },
);

// methods
const suggest = (): void => {
  pours.value = suggestPours(states.value, props.lot.variety, toStore.value);
};

const tankOption = (state: ITankState): string => {
  const variety = state.variety ?? t('lot.split.empty');
  const free = t('lot.split.free', { quantity: formatLitresRounded(state.freeLitres) });
  return canTake(state, props.lot.variety) ? `${formatTank(state.tank)} · ${variety} · ${free}` : `${formatTank(state.tank)} · ${variety} · ${t('lot.split.otherVariety')}`;
};

watch(
  () => [props.oilLitres, mode.value],
  () => {
    if (mode.value === 'store') suggest();
  },
  { immediate: true },
);

watch(handedTyped, () => {
  if (mode.value === 'store') suggest();
});

// event handlers
const handleMode = (next: SplitMode): void => {
  mode.value = next;
  if (next === 'store') handedTyped.value = 0;
};

const handleAddTank = (): void => {
  pours.value.push({ tankId: states.value.find((state) => canTake(state, props.lot.variety) && !pours.value.some((pour) => pour.tankId === state.tank.id))?.tank.id ?? '', litres: 0 });
};

</script>
