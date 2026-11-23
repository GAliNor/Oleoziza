<template>
  <ui-section :title="$t(`configuration.${kind}.title`)" :icon="kind === 'tanks' ? TankLineIcon : MixerLineIcon" :tone="kind === 'tanks' ? 'gold' : 'olive'" :summary="summaryComputed">
    <div class="flex min-w-0 flex-col">
      <TransitionGroup name="row-in" tag="ul" class="flex flex-col divide-y divide-subtle">
        <li v-for="item in items" :key="item.id" class="flex min-h-13 flex-wrap items-center gap-x-2 px-2 py-1">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums" :class="SECTION_TONES[kind === 'tanks' ? 'gold' : 'olive']" aria-hidden="true">{{ item.number }}</span>
          <span class="inline-flex min-w-24 shrink-0 items-center font-medium whitespace-nowrap text-fg-display tabular-nums">{{ label(item) }}</span>
          <div class="relative min-w-0 flex-1 basis-20">
            <Transition name="morph">
              <input
                v-if="editedId === item.id"
                key="field"
                :ref="(element) => (input = element as HTMLInputElement | null)"
                v-model="draft"
                class="input min-h-10 max-w-64"
                :class="{ figure: kind === 'tanks' }"
                :type="kind === 'tanks' ? 'number' : 'text'"
                :inputmode="kind === 'tanks' ? 'numeric' : 'text'"
                :maxlength="kind === 'tanks' ? undefined : 40"
                :aria-label="$t(`configuration.${kind}.${kind === 'tanks' ? 'capacity' : 'name'}`, { number: item.number })"
                :aria-invalid="!!problemComputed"
                @keydown.enter.prevent="handleSave(item)"
                @keydown.esc.stop="editedId = null"
                @blur="handleSave(item)"
              />
              <button
                v-else
                key="value"
                type="button"
                class="group flex min-h-9 w-full items-center gap-2 rounded-control px-2 text-start transition-colors duration-200 ease-(--ease-premium) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus enabled:cursor-pointer enabled:hover:bg-emphasis/50"
                :class="'name' in item && !item.name ? 'text-fg-muted' : 'text-fg-primary-paragraph'"
                :disabled="!!lockReason"
                :title="lockReason ?? undefined"
                @click="handleEdit(item)"
              >
                <span class="truncate">{{ 'capacityLitres' in item ? formatLitresRounded(item.capacityLitres) : item.name || $t('configuration.pressLines.namePlaceholder') }}</span>
                <pencil-line-icon v-if="!lockReason" class="h-3.5 w-3.5 shrink-0 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 pointer-coarse:opacity-70" />
              </button>
            </Transition>
          </div>
          <span v-if="inUseIds.has(item.id)" class="chip shrink-0 bg-selected/50 text-fg-brand" :title="$t(`configuration.${kind}.inUse`)">{{ $t(`configuration.${kind}.inUseShort`) }}</span>
          <ui-confirm-button v-else-if="!lockReason" is-quiet class="shrink-0" :label="$t('configuration.equipment.remove')" :confirm-label="$t('configuration.equipment.removeConfirm')" :is-disabled="configurationStore.isSaving" :aria-label="$t(`configuration.${kind}.remove`, { number: item.number })" @confirm="handleRemove(item)" />
        </li>
      </TransitionGroup>
      <p v-if="problemComputed" class="form-error px-2" role="alert">{{ problemComputed }}</p>
      <button v-if="!lockReason" type="button" class="btn-plain self-start px-2" :disabled="configurationStore.isSaving" @click="handleAdd">
        <add-line-icon class="h-4 w-4" />
        {{ $t(`configuration.${kind}.add`) }}
      </button>
    </div>
  </ui-section>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { createId } from 'global/composables/crypto';
import { SECTION_TONES } from 'global/constants/section';
import { formatLitresRounded } from 'lot/composables/quantity';
import { formatTank, nextNumber } from 'configuration/composables/equipment';
import type { IConfigurationUpdate, IPressLineSetting, ITankSetting } from 'configuration/types/configuration';

import UiSection from 'global/components/ui-section.vue';
import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import MixerLineIcon from 'global/icons/mixer-line.icon.vue';
import TankLineIcon from 'global/icons/tank-line.icon.vue';
import AddLineIcon from 'global/icons/add-line.icon.vue';
import PencilLineIcon from 'global/icons/pencil-line.icon.vue';

type Equipment = ITankSetting | IPressLineSetting;

// props
const props = defineProps<{ kind: 'tanks' | 'pressLines'; siteId: string; items: Equipment[]; firstFreeNumber: number; inUseIds: Set<string>; lockReason: string | null }>();

// stores
const { t } = useI18n();
const configurationStore = useConfigurationStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();

// variables
const NEW_TANK_LITRES = 10000;
const editedId = ref<string | null>(null);
const draft = ref<string | number>('');
const input = ref<HTMLInputElement | null>(null);

// computed
const summaryComputed = computed((): string => {
  if (props.kind === 'pressLines') return t('configuration.pressLines.summary', props.items.length);
  const total = props.items.reduce((sum, item) => sum + ('capacityLitres' in item ? item.capacityLitres : 0), 0);
  return t('configuration.tanks.summary', { count: props.items.length, total: formatLitresRounded(total) }, props.items.length);
});
const problemComputed = computed((): string | null => {
  if (!editedId.value || props.kind === 'pressLines') return null;
  const litres = Number(draft.value);
  return Number.isFinite(litres) && litres >= 100 && litres <= 200000 ? null : t('configuration.tanks.invalid');
});

// methods
const label = (item: Equipment): string => (props.kind === 'tanks' ? formatTank(item) : t('configuration.pressLines.label', { number: item.number }));

const send = async (items: Equipment[]): Promise<boolean> => {
  const update: IConfigurationUpdate = props.kind === 'tanks' ? { id: createId(), tanks: items as ITankSetting[] } : { id: createId(), pressLines: items as IPressLineSetting[] };
  return !!(await configurationStore.update(props.siteId, update));
};

const edit = async (item: Equipment): Promise<void> => {
  editedId.value = item.id;
  draft.value = 'capacityLitres' in item ? item.capacityLitres : item.name;
  await nextTick();
  input.value?.focus();
  input.value?.select();
};

// event handlers
const handleEdit = (item: Equipment): Promise<void> => edit(item);

const handleSave = async (item: Equipment): Promise<void> => {
  if (editedId.value !== item.id || problemComputed.value) return;
  const changed: Equipment = 'capacityLitres' in item ? { ...item, capacityLitres: Number(draft.value) } : { ...item, name: String(draft.value).trim() };
  editedId.value = null;
  if (JSON.stringify(changed) === JSON.stringify(item)) return;
  await send(props.items.map((other) => (other.id === item.id ? changed : other)));
};

/** Added at once with the next free number, then ready to be named or sized. */
const handleAdd = async (): Promise<void> => {
  const number = nextNumber(props.items, props.firstFreeNumber);
  const added: Equipment = props.kind === 'tanks' ? { id: createId(), number, capacityLitres: NEW_TANK_LITRES } : { id: createId(), number, name: '' };
  if (await send([...props.items, added])) await edit(added);
};

/** Never used by a Lot, it is really deleted by an Owner; otherwise it is retired and its past stays. */
const handleRemove = async (item: Equipment): Promise<void> => {
  if (!(await send(props.items.filter((other) => other.id !== item.id)))) return;
  toastStore.push(t(sessionStore.session?.isOwner ? 'configuration.equipment.removed' : 'configuration.equipment.retired', { name: label(item) }), 'success');
};
</script>
