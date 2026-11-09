<template>
  <article class="card flex flex-col gap-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="heading-five">{{ $t(`configuration.${kind}.title`) }}</h2>
        <p class="body-two">{{ $t(`configuration.${kind}.hint`) }}</p>
      </div>
      <button v-if="!isEditing && !isReadOnly" type="button" class="link shrink-0" :disabled="!isOnline" @click="handleEdit">{{ $t('configuration.edit') }}</button>
    </div>

    <template v-if="!isEditing">
      <p class="text-display-xs figure text-fg-display">{{ summarize(items) }}</p>
      <ul v-if="items.length" class="flex flex-wrap gap-2">
        <li v-for="item in items" :key="item.id" class="chip bg-subtle text-fg-primary-paragraph tabular-nums">
          {{ describeItem(item) }}<span v-if="inUseIds.has(item.id)" class="ms-1 text-fg-brand">·&nbsp;{{ $t(`configuration.${kind}.inUseShort`) }}</span>
        </li>
      </ul>
    </template>
    <form v-else class="flex flex-col gap-2" @submit.prevent="handleSave">
      <ul class="flex flex-col gap-2">
        <li v-for="(row, index) in rows" :key="row.id" class="flex items-center gap-2">
          <span class="w-20 shrink-0 font-medium text-fg-display">{{ kind === 'tanks' ? formatTank(row) : $t('configuration.pressLines.label', { number: row.number }) }}</span>
          <div v-if="kind === 'tanks'" class="relative min-w-0 flex-1">
            <input v-model.number="row.capacityLitres" class="input pe-10 figure" type="number" inputmode="numeric" min="100" step="100" :aria-label="$t('configuration.tanks.capacity', { number: row.number })" />
            <span class="pointer-events-none absolute top-1/2 inset-e-3 -translate-y-1/2 body-two">{{ $t('global.units.litre') }}</span>
          </div>
          <input v-else v-model="row.name" class="input min-w-0 flex-1" type="text" maxlength="40" :placeholder="$t('configuration.pressLines.namePlaceholder')" :aria-label="$t('configuration.pressLines.name', { number: row.number })" />
          <button
            type="button"
            class="icon-btn shrink-0"
            :disabled="inUseIds.has(row.id)"
            :title="inUseIds.has(row.id) ? $t(`configuration.${kind}.inUse`) : undefined"
            :aria-label="$t(`configuration.${kind}.remove`, { number: row.number })"
            @click="rows.splice(index, 1)"
          >
            <close-line-icon class="h-5 w-5" />
          </button>
        </li>
      </ul>
      <p v-if="lockedCount" class="body-two">{{ $t(`configuration.${kind}.lockedNote`, { count: lockedCount }) }}</p>
      <button type="button" class="btn-secondary self-start" @click="handleAdd">
        <add-line-icon class="h-5 w-5" />
        {{ $t(`configuration.${kind}.add`) }}
      </button>
      <p v-if="!isValid" class="form-error">{{ $t(`configuration.${kind}.invalid`) }}</p>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn-secondary" @click="isEditing = false">{{ $t('configuration.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="!canSave">{{ $t('configuration.save') }}</button>
      </div>
    </form>

    <configuration-history v-if="changes.length" :changes="changes" :describe="(change) => summarize(kind === 'tanks' ? (change.equipment?.tanks ?? []) : (change.equipment?.pressLines ?? []))" />
  </article>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { useToastStore } from 'global/stores/toast';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { createId } from 'global/composables/crypto';
import { formatLitresRounded } from 'lot/composables/quantity';
import { formatPressLine, formatTank, nextNumber } from 'configuration/composables/equipment';
import type { IConfigurationChange, IPressLineSetting, ITankSetting } from 'configuration/types/configuration';

import ConfigurationHistory from 'configuration/components/configuration-history.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import CloseLineIcon from 'global/icons/close-line.icon.vue';

type EquipmentRow = ITankSetting & IPressLineSetting;

// props
const props = defineProps<{
  kind: 'tanks' | 'pressLines';
  siteId: string;
  items: (ITankSetting | IPressLineSetting)[];
  inUseIds: Set<string>;
  changes: IConfigurationChange[];
  isReadOnly: boolean;
}>();

// stores
const { t } = useI18n();
const configurationStore = useConfigurationStore();
const toastStore = useToastStore();
const { isOnline } = useOnlineStatus();

// variables
const DEFAULT_TANK_LITRES = 10000;
const isEditing = ref(false);
const rows = ref<EquipmentRow[]>([]);
const changeId = ref('');

// computed
const lockedCount = computed((): number => rows.value.filter((row) => props.inUseIds.has(row.id)).length);
const isValid = computed((): boolean =>
  props.kind === 'tanks' ? rows.value.every((row) => typeof row.capacityLitres === 'number' && row.capacityLitres >= 100 && row.capacityLitres <= 200000) : rows.value.length > 0,
);
const canSave = computed((): boolean => isValid.value && !configurationStore.isSaving);

// methods
const describeItem = (item: ITankSetting | IPressLineSetting): string =>
  'capacityLitres' in item ? `${formatTank(item)} · ${formatLitresRounded(item.capacityLitres)}` : formatPressLine(item);

const summarize = (list: readonly (ITankSetting | IPressLineSetting)[]): string => {
  if (props.kind === 'pressLines') return t('configuration.pressLines.summary', { count: list.length });
  const total = list.reduce((sum, item) => sum + ('capacityLitres' in item ? item.capacityLitres : 0), 0);
  return t('configuration.tanks.summary', { count: list.length, total: formatLitresRounded(total) });
};

// event handlers
const handleEdit = (): void => {
  rows.value = props.items.map((item) => ({ capacityLitres: 0, name: '', ...item }));
  changeId.value = createId();
  isEditing.value = true;
};

const handleAdd = (): void => {
  const number = nextNumber([...props.items, ...rows.value]);
  rows.value.push({ id: `${props.siteId}-${props.kind}-${createId()}`, number, capacityLitres: DEFAULT_TANK_LITRES, name: '' });
};

const handleSave = async (): Promise<void> => {
  if (!canSave.value) return;
  const update =
    props.kind === 'tanks'
      ? { id: changeId.value, tanks: rows.value.map(({ id, number, capacityLitres }) => ({ id, number, capacityLitres })) }
      : { id: changeId.value, pressLines: rows.value.map(({ id, number, name }) => ({ id, number, name: name.trim() })) };
  const updated = await configurationStore.update(props.siteId, update);
  if (!updated) {
    toastStore.push(t(`configuration.${props.kind}.saveError`), 'danger');
    return;
  }
  toastStore.push(t('configuration.saved'), 'success');
  isEditing.value = false;
};
</script>
