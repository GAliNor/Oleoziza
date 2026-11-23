<template>
  <section :ref="setFormRoot" class="flex flex-col gap-5">
    <button type="button" class="btn-secondary min-h-14 self-start" @click="emit('close')">
      <arrow-left-line-icon class="h-5 w-5" />
      {{ backLabel }}
    </button>

    <div class="flex flex-col items-center gap-2 text-center">
      <ui-avatar class="h-24 w-24" :name="lot.clientName" :variant="avatarVariant" />
      <p class="body-two">{{ $t('dashboard.operator.confirm.youWill') }}</p>
      <h2 class="heading-two">{{ $t(`lot.move.${lot.status}`) }}</h2>
      <p class="text-lg text-fg-default">{{ $t('dashboard.operator.confirm.forClient') }} <strong>{{ lot.clientName }}</strong></p>
      <p class="body-two">{{ lot.variety }} · {{ formatKg(lot.netKg) }} · {{ lot.code }}</p>
    </div>

    <div class="flex items-center justify-center gap-3 text-sm font-medium">
      <span class="rounded-control bg-subtle px-3 py-1.5 text-fg-primary-paragraph">{{ $t(`lot.status.${lot.status}`) }}</span>
      <span aria-hidden="true">{{ $t('global.arrow') }}</span>
      <span class="rounded-control bg-action px-3 py-1.5 text-fg-on-action">{{ nextLabel }}</span>
    </div>

    <section v-if="lot.status === 'waiting' && lines.length" class="flex flex-col gap-2" data-field="line">
      <h3 class="label">{{ $t('dashboard.operator.confirm.line') }}</h3>
      <div class="grid gap-2" :class="lines.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
        <button
          v-for="line in lines"
          :key="line.id"
          type="button"
          class="toggle-tile flex flex-col items-start text-start"
          :class="{ 'toggle-tile-active': pressLineId === line.id }"
          :disabled="!!busyOn(line.id)"
          @click="pressLineId = line.id"
        >
          <span class="font-semibold">{{ formatPressLine(line) }}</span>
          <span class="text-sm font-normal opacity-80">{{ busyOn(line.id) ? $t('dashboard.operator.confirm.lineBusy', { client: busyOn(line.id)?.clientName ?? '' }) : $t('dashboard.operator.confirm.lineFree') }}</span>
        </button>
      </div>
    </section>

    <ui-field v-if="lot.status === 'pressing'" v-slot="{ id, describedBy, isInvalid }" name="oil" :label="$t('dashboard.operator.confirm.oil')" :error="errorOf('oil')" :is-valid="isValid('oil')" @leave="touch('oil')">
      <input :id="id" v-model.number="oilLitres" class="input text-display-xs font-semibold" type="number" inputmode="decimal" min="0" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
    </ui-field>

    <oil-split data-field="split" v-if="lot.status === 'pressing' && oilLitres" :key="`${lot.id}-${moveId}`" :lot="lot" :oil-litres="oilLitres" :tanks="tanks" :lots="lotStore.lots" @change="split = $event" />

    <p v-if="isUnpaidWithdrawal" class="rounded-control bg-warning-subtle p-3 text-center font-medium text-fg-warning" role="status">{{ $t('dashboard.operator.confirm.unpaid') }}</p>

    <ui-photo-capture v-model="photo" :label="$t('dashboard.operator.confirm.photo')" />

    <ui-form-bar :problems="problemsComputed" :is-attempted="isAttempted" :is-busy="lotStore.isSaving" :submit-label="$t('dashboard.operator.confirm.yes')" @jump="jumpTo" @submit="handleSubmit">
      <template #actions>
        <button type="button" class="btn-secondary min-h-13 flex-1 text-md" @click="emit('close')">{{ $t('dashboard.operator.confirm.no') }}</button>
      </template>
    </ui-form-bar>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useLotStore } from 'lot/stores/lot';
import { useFormFeedback } from 'global/composables/use-form-feedback';
import { createId } from 'global/composables/crypto';
import type { AvatarVariant } from 'global/types/avatar';
import type { ILot, ILotMove, IOilSplit } from 'lot/types/lot';
import { formatKg } from 'lot/composables/quantity';
import { paymentStateOf } from 'lot/composables/fee';
import { pressingOn } from 'lot/composables/press-schedule';
import { formatPressLine } from 'configuration/composables/equipment';
import type { IPressLineSetting, ITankSetting } from 'configuration/types/configuration';

import UiAvatar from 'global/components/ui-avatar.vue';
import UiField from 'global/components/ui-field.vue';
import UiFormBar from 'global/components/ui-form-bar.vue';
import UiPhotoCapture from 'global/components/ui-photo-capture.vue';
import OilSplit from 'lot/components/oil-split.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';

// props
const props = defineProps<{ lot: ILot; avatarVariant: AvatarVariant; nextLabel: string; backLabel: string; lines: IPressLineSetting[]; tanks: ITankSetting[] }>();

// emits
const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm', lot: ILot, move: ILotMove): void;
}>();

// stores
const { t } = useI18n();
const lotStore = useLotStore();

// variables
const oilLitres = ref<number | null>(null);
const moveId = ref(createId());
const photo = ref<string | null>(null);
const pressLineId = ref('');
const split = ref<IOilSplit | null>(null);

// computed
const isUnpaidWithdrawal = computed((): boolean => props.lot.status === 'pressed' && props.lot.mode === 'service_milling' && ['unpaid', 'partial'].includes(paymentStateOf(props.lot)));
const isLineMissing = computed((): boolean => props.lot.status === 'waiting' && props.lines.length > 0 && (!pressLineId.value || !!busyOn(pressLineId.value)));
const isPressingComputed = computed((): boolean => props.lot.status === 'pressing');
const { setFormRoot, problemsComputed, isAttempted, errorOf, isValid, touch, jumpTo, attempt, reset } = useFormFeedback(() => [
  { key: 'line', label: t('dashboard.operator.confirm.line'), isMissing: isLineMissing.value },
  { key: 'oil', label: t('dashboard.operator.confirm.oil'), isMissing: isPressingComputed.value && !oilLitres.value, isFilled: true },
  { key: 'split', label: t('lot.split.label'), isMissing: isPressingComputed.value && !!oilLitres.value && !split.value?.isValid },
]);

// methods
const busyOn = (lineId: string): ILot | undefined => pressingOn(lotStore.lots, lineId, props.lot.id);

/** The Lot's own Line when free, else the first free one: a Line presses one Lot at a time. */
const pickLine = (): void => {
  const own = props.lot.pressLineId && !busyOn(props.lot.pressLineId) ? props.lot.pressLineId : null;
  pressLineId.value = own ?? props.lines.find((line) => !busyOn(line.id))?.id ?? '';
};

// watchers
watch(
  () => props.lot.id,
  () => {
    oilLitres.value = null;
    photo.value = null;
    split.value = null;
    moveId.value = createId();
    reset();
    pickLine();
  },
  { immediate: true },
);

const save = (): void => {
  const isPressingEnd = props.lot.status === 'pressing' && split.value;
  emit('confirm', props.lot, {
    id: moveId.value,
    oilLitres: oilLitres.value ?? undefined,
    photoUrl: photo.value ?? undefined,
    pressLineId: props.lot.status === 'waiting' && pressLineId.value ? pressLineId.value : undefined,
    ...(isPressingEnd ? { handedLitres: split.value?.handedLitres, pours: split.value?.pours, plannedUntil: split.value?.plannedUntil } : {}),
  });
};

// event handlers
const handleSubmit = (): void => attempt(save);
</script>
