<template>
  <vue-date-picker
    :key="language"
    v-model="pickedValue"
    class="ui-date-picker"
    :model-type="modelFormat"
    :formats="{ input: inputFormat, preview: inputFormat, weekDay: language === 'ar' ? 'EEEEE' : 'EEEEEE' }"
    :locale="DATE_FNS_LOCALES[language]"
    :min-date="toDate(min)"
    :max-date="toDate(max)"
    :time-config="{ enableTimePicker: mode === 'datetime', is24: true, minutesIncrement: 5 }"
    :action-row="{ showNow: true, nowBtnLabel: $t('global.datePicker.today'), selectBtnLabel: $t('global.datePicker.select'), cancelBtnLabel: $t('global.datePicker.cancel') }"
    :input-attrs="{ id, required, clearable: isClearable, inputmode: 'none' }"
    :aria-labels="{ input: label, menu: label }"
    :placeholder="placeholder"
    :disabled="isDisabled"
    :auto-apply="mode === 'date'"
    :week-start="1"
    prevent-min-max-navigation
    teleport
  />
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { DATE_FNS_LOCALES } from '~/plugins/date-fns';
import type { Language } from 'global/types/locale';

// props
const props = withDefaults(
  defineProps<{
    /** `date` holds `yyyy-MM-dd`; `datetime` holds `yyyy-MM-ddTHH:mm`, as the native inputs did. */
    mode?: 'date' | 'datetime';
    min?: string;
    max?: string;
    label: string;
    id?: string;
    placeholder?: string;
    required?: boolean;
    isClearable?: boolean;
    isDisabled?: boolean;
  }>(),
  { mode: 'date', min: undefined, max: undefined, id: undefined, placeholder: undefined, required: false, isClearable: false, isDisabled: false },
);

// emits
/** Empty string when nothing is picked, like the native inputs it replaces. */
const model = defineModel<string>({ required: true });

// stores
const { locale } = useI18n();

// computed
const pickedValue = computed({
  get: (): string | null => model.value || null,
  set: (value: string | null): void => {
    model.value = value ?? '';
  },
});
const language = computed((): Language => (locale.value === 'ar' ? 'ar' : 'fr'));
const modelFormat = computed((): string => (props.mode === 'datetime' ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd'));
const inputFormat = computed((): string => (props.mode === 'datetime' ? 'dd/MM/yyyy HH:mm' : 'EEE d MMM yyyy'));

// methods
const toDate = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  const [day, time = '00:00'] = value.split('T');
  const [year, month, date] = day.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, date, hours, minutes);
};
</script>
