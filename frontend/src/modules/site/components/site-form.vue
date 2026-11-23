<template>
  <form :ref="setFormRoot" class="card flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
    <h2 class="heading-four">{{ site ? $t('site.form.editTitle') : $t('site.form.createTitle') }}</h2>
    <ui-field v-slot="{ id, describedBy, isInvalid }" name="name" :label="$t('site.form.name')" :error="errorOf('name')" :is-valid="isValid('name')" @leave="touch('name')">
      <input :id="id" v-model="form.name" class="input" type="text" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
    </ui-field>
    <ui-field v-if="!site" v-slot="{ id, describedBy, isInvalid }" name="code" :label="$t('site.form.code')" :error="errorOf('code')" :is-valid="isValid('code')" :hint="$t('site.form.codeHint')" @leave="touch('code')">
      <input :id="id" class="input uppercase" type="text" maxlength="2" autocomplete="off" :value="form.code" :aria-invalid="isInvalid" :aria-describedby="describedBy" @input="handleCodeInput" />
    </ui-field>
    <location-fields v-model="form.location" :errors="{ province: errorOf('province'), city: errorOf('city'), address: errorOf('address') }" @leave="touch" />
    <ui-field v-slot="{ id, describedBy, isInvalid }" name="phone" :label="$t('site.form.phone')" :error="errorOf('phone')" :is-valid="isValid('phone')" is-optional @leave="touch('phone')">
      <ui-phone-input :id="id" v-model="phoneComputed" :aria-invalid="isInvalid" :aria-describedby="describedBy" />
    </ui-field>
    <p v-if="siteStore.hasSaveError" class="form-error" role="alert">{{ errorMessageComputed }}</p>
    <ui-form-bar :problems="problemsComputed" :is-attempted="isAttempted" :is-busy="siteStore.isSaving" :is-wide="false" :submit-label="$t('site.form.save')" @jump="jumpTo" @submit="handleSubmit">
      <template #actions>
        <button type="button" class="btn-secondary min-h-13" @click="handleCancel">{{ $t('site.form.cancel') }}</button>
      </template>
    </ui-form-bar>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { siteErrorMessage } from 'site/composables/site-errors';
import { useFormFeedback } from 'global/composables/use-form-feedback';
import { normalizePhone } from 'global/composables/phone';
import { trimmedLocation } from 'territory/composables/location';
import { EMPTY_LOCATION } from 'territory/constants/provinces';
import type { IFormRule } from 'global/types/form';
import type { ISite, ISiteForm } from 'site/types/site';

import LocationFields from 'territory/components/location-fields.vue';
import UiField from 'global/components/ui-field.vue';
import UiFormBar from 'global/components/ui-form-bar.vue';
import UiPhoneInput from 'global/components/ui-phone-input.vue';

// props
const props = defineProps<{ site?: ISite }>();

// emits
const emit = defineEmits<{
  (event: 'saved', site: ISite): void;
  (event: 'cancel'): void;
}>();

// stores
const siteStore = useSiteStore();
const toastStore = useToastStore();
const { t } = useI18n();

// variables
const CODE_PATTERN = /^[A-Z]{2}$/;
const form = reactive<ISiteForm>({ code: '', name: '', location: { ...EMPTY_LOCATION }, phone: null });

// computed
const errorMessageComputed = computed((): string => siteErrorMessage(siteStore.saveErrorCode, t('site.form.error')));

const phoneComputed = computed({ get: (): string => form.phone ?? '', set: (value: string) => (form.phone = value || null) });
const rulesComputed = computed((): IFormRule[] => [
  { key: 'name', label: t('site.form.name'), isMissing: !form.name.trim(), isFilled: true },
  ...(props.site ? [] : [{ key: 'code', label: t('site.form.code'), isMissing: !form.code, error: form.code && !CODE_PATTERN.test(form.code) ? t('site.form.codeHint') : null, isFilled: true }]),
  { key: 'province', label: t('territory.fields.area'), isMissing: !form.location.province, isFilled: true },
  { key: 'city', label: t('territory.fields.city'), isMissing: !form.location.city.trim(), isFilled: true },
  { key: 'address', label: t('territory.fields.address'), isMissing: !form.location.address.trim(), isFilled: true },
  { key: 'phone', label: t('site.form.phone'), error: form.phone && !normalizePhone(form.phone) ? t('global.form.phoneInvalid') : null, isFilled: !!form.phone },
]);
const { setFormRoot, problemsComputed, isAttempted, errorOf, isValid, touch, jumpTo, attempt, reset } = useFormFeedback(() => rulesComputed.value);

// methods
const fillForm = (site?: ISite): void => {
  form.code = site?.code ?? '';
  form.name = site?.name ?? '';
  form.location = site ? { province: site.province, city: site.city, address: site.address } : { ...EMPTY_LOCATION };
  form.phone = site?.phone ?? null;
  siteStore.clearSaveError();
  reset();
};

const save = async (): Promise<void> => {
  const phone = form.phone?.trim() || null;
  const site = await siteStore.save({ code: form.code, name: form.name.trim(), location: trimmedLocation(form.location), phone }, props.site?.id);
  if (!site) return;
  toastStore.push(t('site.form.saved'), 'success');
  emit('saved', site);
};

// watchers
watch(() => props.site, fillForm, { immediate: true });

// event handlers
const handleCodeInput = (event: Event): void => {
  form.code = (event.target as HTMLInputElement).value.toUpperCase();
};

const handleCancel = (): void => {
  fillForm(props.site);
  emit('cancel');
};

const handleSubmit = (): void => attempt(save);
</script>
