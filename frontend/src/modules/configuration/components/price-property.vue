<template>
  <ui-property
    :label="$t(`configuration.values.${valueKey}.title`)"
    :hint="$t(`configuration.values.${valueKey}.hint`)"
    :is-locked="!!lockReason"
    :lock-reason="lockReason ?? undefined"
    :problem="problemComputed"
    :save="save"
    is-explicit
    :action-label="$t('configuration.price.change')"
    @start="handleStart"
  >
    <span class="text-xl figure text-fg-display">{{ formatSettingValue(valueKey, configuration[valueKey]) }}</span>
    <span v-if="sinceComputed" class="block body-three">{{ sinceComputed }}</span>
    <template #editor>
      <div class="flex items-center gap-2">
        <input v-model.number="draft" class="input min-h-11 max-w-36 text-lg figure" type="number" inputmode="decimal" :min="setting.min" :max="setting.max" :step="setting.step" :aria-label="$t(`configuration.values.${valueKey}.title`)" :aria-invalid="!!problemComputed" />
        <span class="body-two whitespace-nowrap">{{ $t(`configuration.units.${setting.unitKey}`) }}</span>
        <span class="caption whitespace-nowrap">{{ $t(isPlanned ? 'configuration.price.fromStart' : 'configuration.price.now') }}</span>
      </div>
    </template>
    <template #below>
      <ui-reveal v-if="historyComputed.length" class="-mx-2" :label="$t('configuration.history.title', { count: historyComputed.length })">
        <ol class="flex flex-col pb-1">
          <li v-for="change in historyComputed" :key="change.id" class="flex min-h-10 flex-wrap items-center justify-between gap-x-3 rounded-control px-2 transition-colors hover:bg-subtle">
            <span class="flex items-baseline gap-2">
              <span class="font-medium text-fg-display tabular-nums">{{ formatSettingValue(valueKey, change.value) }}</span>
              <span v-if="change.id === inForceComputed?.id" class="chip bg-success-subtle text-fg-success">{{ $t('configuration.price.inForce') }}</span>
              <span v-else-if="change.isScheduled && !isPlanned" class="chip bg-info-subtle text-fg-info">{{ $t('configuration.price.scheduled') }}</span>
            </span>
            <span class="flex items-center gap-1">
              <span class="body-three">{{ describe(change) }}</span>
              <ui-confirm-button v-if="canDelete(change)" is-quiet :label="$t('configuration.price.delete')" :confirm-label="$t('configuration.price.deleteConfirm')" :is-disabled="configurationStore.isSaving" @confirm="handleDelete(change)" />
            </span>
          </li>
        </ol>
      </ui-reveal>
    </template>
  </ui-property>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { createId } from 'global/composables/crypto';
import { formatDateTime, formatFullDate } from 'global/composables/date';
import { priceHistory, priceInForce } from 'configuration/composables/price-history';
import { formatSettingValue } from 'configuration/composables/setting-value';
import { CONFIGURATION_VALUES } from 'configuration/constants/configuration';
import type { ConfigurationValueKey, IConfiguration, IPriceChange } from 'configuration/types/configuration';

import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import UiProperty from 'global/components/ui-property.vue';
import UiReveal from 'global/components/ui-reveal.vue';

// props
const props = defineProps<{ valueKey: ConfigurationValueKey; configuration: IConfiguration; lockReason: string | null }>();

// stores
const { t } = useI18n();
const configurationStore = useConfigurationStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();

// variables
const draft = ref<number | ''>(0);
const changeId = ref('');
const setting = CONFIGURATION_VALUES.find((item) => item.key === props.valueKey) ?? CONFIGURATION_VALUES[0];

// computed
const isPlanned = computed((): boolean => props.configuration.seasonStatus === 'planned');
const historyComputed = computed((): IPriceChange[] => priceHistory(props.configuration.priceChanges, props.valueKey));
const inForceComputed = computed((): IPriceChange | undefined => (isPlanned.value ? historyComputed.value[0] : priceInForce(props.configuration.priceChanges, props.valueKey)));
const sinceComputed = computed((): string => (inForceComputed.value ? t('configuration.price.since', { date: formatFullDate(inForceComputed.value.effectiveFrom) }) : t('configuration.price.default')));
const problemComputed = computed((): string | null => {
  const value = draft.value;
  return typeof value === 'number' && value >= setting.min && value <= setting.max ? null : t('configuration.outOfRange', { min: setting.min, max: setting.max });
});

// methods
const describe = (change: IPriceChange): string => [formatDateTime(change.effectiveFrom), change.by].filter(Boolean).join(' · ');

/** A price already in force is the Owner's to delete; one still to come, anyone's who may change prices. */
const canDelete = (change: IPriceChange): boolean => !props.lockReason && (change.isScheduled || sessionStore.session?.isOwner === true);

const save = async (): Promise<true | string> => {
  if (typeof draft.value !== 'number') return problemComputed.value ?? '';
  if (draft.value === props.configuration[props.valueKey]) return true;
  const updated = await configurationStore.update(props.configuration.siteId, { id: changeId.value, seasonId: props.configuration.seasonId ?? undefined, value: { key: props.valueKey, amount: draft.value } });
  return updated ? true : t('configuration.saveError');
};

// event handlers
const handleStart = (): void => {
  draft.value = props.configuration[props.valueKey];
  changeId.value = createId();
};

const handleDelete = async (change: IPriceChange): Promise<void> => {
  const updated = await configurationStore.deletePriceChange(props.configuration.siteId, change.id);
  if (updated) toastStore.push(t('configuration.price.deleted', { value: formatSettingValue(props.valueKey, updated[props.valueKey]) }), 'success');
};
</script>
