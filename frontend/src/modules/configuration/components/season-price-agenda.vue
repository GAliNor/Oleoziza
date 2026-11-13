<template>
  <section class="card flex flex-col gap-4">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="heading-five">{{ title ?? $t('configuration.agenda.title') }}</h3>
      <p class="caption text-fg-muted">{{ $t('configuration.agenda.legend') }}</p>
    </div>
    <p v-if="season.status === 'closed'" class="body-two">{{ $t('configuration.season.readOnlyClosed') }}</p>

    <div class="relative">
      <div class="grid border-b border-default pb-1" :style="{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }">
        <span v-for="month in months" :key="month" class="caption capitalize text-fg-muted">{{ formatMonth(month) }}</span>
      </div>
      <div class="mt-3 flex flex-col gap-3">
        <div v-for="setting in CONFIGURATION_VALUES" :key="setting.key" class="flex flex-col gap-1">
          <div class="flex items-center justify-between gap-2">
            <span class="label">{{ $t(`configuration.values.${setting.key}.title`) }}</span>
            <button v-if="!isLocked" type="button" class="link caption" @click="openForm(setting.key)">{{ $t('configuration.agenda.schedule') }}</button>
          </div>
          <div class="relative h-9 rounded-control bg-subtle">
            <component
              :is="segment.change.isScheduled && !isLocked ? 'button' : 'div'"
              v-for="segment in segmentsOf(setting.key)"
              :key="segment.change.id"
              :type="segment.change.isScheduled && !isLocked ? 'button' : undefined"
              class="absolute inset-y-0.5 flex items-center overflow-hidden rounded-control px-2 text-xs font-semibold text-white"
              :class="{ 'ring-2 ring-accent-gold': picked?.id === segment.change.id }"
              :style="{ insetInlineStart: `${segment.start * 100}%`, width: `${Math.max(segment.end - segment.start, 0.02) * 100}%`, background: fill(setting.key, segment.change.isScheduled) }"
              :title="describe(segment.change)"
              @click="segment.change.isScheduled && !isLocked ? (picked = segment.change) : undefined"
            >
              <span class="truncate drop-shadow">{{ formatValue(setting.key, segment.change.value) }}</span>
            </component>
          </div>
        </div>
      </div>
      <div v-if="season.status === 'open' && isTodayInSeason" class="pointer-events-none absolute top-6 bottom-0 w-0.5 bg-danger" :style="{ insetInlineStart: `${positionInSeason(season, today) * 100}%` }">
        <span class="absolute -top-5 start-1 rounded bg-danger px-1 caption whitespace-nowrap text-white">{{ $t('configuration.agenda.today') }}</span>
      </div>
    </div>

    <div v-if="picked" class="flex flex-wrap items-center justify-between gap-2 rounded-card border border-dashed border-accent p-3">
      <p class="body-two">{{ $t('configuration.agenda.scheduledInfo', { value: formatValue(picked.key, picked.value), date: formatDay(picked.effectiveFrom) }) }}</p>
      <div class="flex gap-2">
        <ui-confirm-button :label="$t('configuration.agenda.cancelChange')" :confirm-label="$t('configuration.agenda.cancelConfirm')" :is-disabled="configurationStore.isSaving" @confirm="handleCancel" />
        <button type="button" class="btn-secondary" @click="picked = null">{{ $t('configuration.cancel') }}</button>
      </div>
    </div>

    <form v-if="formKey && formSetting" class="flex flex-wrap items-end gap-3 rounded-card border border-dashed border-accent p-3" novalidate @submit.prevent="handleSchedule">
      <p class="label w-full">{{ $t(`configuration.values.${formKey}.title`) }}</p>
      <ui-field v-slot="{ id }" :label="$t('configuration.agenda.newPrice')">
        <div class="flex items-center gap-2">
          <input :id="id" v-model.number="formValue" type="number" class="input w-32" :min="formSetting.min" :max="formSetting.max" :step="formSetting.step" required />
          <span class="body-two">{{ $t(`configuration.units.${formSetting.unitKey}`) }}</span>
        </div>
      </ui-field>
      <ui-field v-slot="{ id }" :label="$t('configuration.agenda.from')">
        <ui-date-picker :id="id" v-model="formDate" class="max-w-80" :min="firstDay" :max="lastDay" :label="$t('configuration.agenda.from')" required />
      </ui-field>
      <div class="flex gap-2">
        <button type="submit" class="btn-primary" :disabled="configurationStore.isSaving">{{ $t('configuration.agenda.submit') }}</button>
        <button type="button" class="btn-secondary" @click="formKey = null">{{ $t('configuration.cancel') }}</button>
      </div>
      <p class="caption w-full text-fg-muted">{{ $t(`configuration.values.${formKey}.hint`) }}</p>
      <p v-if="formError" class="form-error w-full" role="alert">{{ formError }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { useToastStore } from 'global/stores/toast';
import { createId } from 'global/composables/crypto';
import { formatShortDate, todayIso } from 'global/composables/date';
import { formatNumber } from 'global/composables/number';
import { positionInSeason, priceSegments, seasonEnd, seasonMonths, type IPriceSegment } from 'configuration/composables/season-agenda';
import { CONFIGURATION_VALUES } from 'configuration/constants/configuration';
import type { ConfigurationValueKey, IConfiguration, IPriceChange } from 'configuration/types/configuration';
import type { ISeason } from 'season/types/season';

import UiDatePicker from 'global/components/ui-date-picker.vue';
import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import UiField from 'global/components/ui-field.vue';

// props
const props = defineProps<{ season: ISeason; configuration: IConfiguration; isReadOnly: boolean; title?: string }>();

// stores
const configurationStore = useConfigurationStore();
const toastStore = useToastStore();
const { t, locale } = useI18n();

// variables
const PRICE_TONES: Record<ConfigurationValueKey, string> = {
  millingRate: 'var(--color-primary-olive)',
  discountLimit: 'var(--color-accent-rust)',
  oilPrice: 'var(--color-accent-gold)',
};
const today = todayIso();
const formKey = ref<ConfigurationValueKey | null>(null);
const formValue = ref(0);
const formDate = ref('');
const formChangeId = ref('');
const formError = ref('');
const picked = ref<IPriceChange | null>(null);

// computed
const isLocked = computed((): boolean => props.isReadOnly || props.season.status === 'closed');
const months = computed((): string[] => seasonMonths(props.season));
const lastDay = computed((): string => seasonEnd(props.season));
const isTodayInSeason = computed((): boolean => today >= props.season.startsOn && today <= lastDay.value);
const firstDay = computed((): string => (props.season.status === 'open' && today > props.season.startsOn ? today : props.season.startsOn));
const formSetting = computed(() => CONFIGURATION_VALUES.find((setting) => setting.key === formKey.value));

// methods
const segmentsOf = (key: ConfigurationValueKey): IPriceSegment[] => priceSegments(props.season, props.configuration.priceChanges, key);
const fill = (key: ConfigurationValueKey, isScheduled: boolean): string =>
  isScheduled ? `repeating-linear-gradient(135deg, ${PRICE_TONES[key]} 0 8px, color-mix(in oklab, ${PRICE_TONES[key]} 55%, white) 8px 16px)` : PRICE_TONES[key];
const formatValue = (key: ConfigurationValueKey, value: number): string => {
  const setting = CONFIGURATION_VALUES.find((item) => item.key === key);
  return `${formatNumber(value, 2, key === 'millingRate' ? 2 : 0)} ${t(`configuration.units.${setting?.unitKey ?? 'perKg'}`)}`;
};
const formatDay = (instant: string): string => formatShortDate(instant);
const formatMonth = (month: string): string => new Date(`${month}-15T12:00:00Z`).toLocaleDateString(locale.value === 'ar' ? 'ar-MA' : 'fr-MA', { month: 'long', year: 'numeric' });
const describe = (change: IPriceChange): string => {
  const line = t('configuration.agenda.segment', { value: formatValue(change.key, change.value), date: formatDay(change.effectiveFrom) });
  return change.by ? `${line} · ${t('configuration.agenda.by', { name: change.by })}` : line;
};
const openForm = (key: ConfigurationValueKey): void => {
  formKey.value = key;
  formValue.value = props.configuration[key];
  formDate.value = firstDay.value;
  formChangeId.value = createId();
  formError.value = '';
  picked.value = null;
};

// event handlers
const handleSchedule = async (): Promise<void> => {
  const setting = formSetting.value;
  if (!formKey.value || !setting) return;
  if (!Number.isFinite(formValue.value) || formValue.value < setting.min || formValue.value > setting.max) {
    formError.value = t('configuration.outOfRange', { min: setting.min, max: setting.max });
    return;
  }
  if (!formDate.value || formDate.value < firstDay.value || formDate.value > lastDay.value) {
    formError.value = t('configuration.agenda.dateRange', { min: formatShortDate(`${firstDay.value}T12:00:00Z`), max: formatShortDate(`${lastDay.value}T12:00:00Z`) });
    return;
  }
  const isNow = props.season.status === 'open' && formDate.value === today;
  const updated = await configurationStore.update(props.configuration.siteId, {
    id: formChangeId.value,
    seasonId: props.season.id,
    value: { key: formKey.value, amount: formValue.value, effectiveOn: formDate.value },
  });
  if (!updated) {
    toastStore.push(t('configuration.saveError'), 'danger');
    return;
  }
  toastStore.push(isNow ? t('configuration.agenda.saved') : t('configuration.agenda.scheduled'), 'success');
  formKey.value = null;
};
const handleCancel = async (): Promise<void> => {
  if (!picked.value) return;
  const updated = await configurationStore.cancelPriceChange(props.configuration.siteId, picked.value.id);
  toastStore.push(updated ? t('configuration.agenda.cancelled') : t('configuration.saveError'), updated ? 'success' : 'danger');
  if (updated) picked.value = null;
};
</script>
