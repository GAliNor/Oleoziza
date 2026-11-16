<template>
  <form class="card flex flex-col gap-4" @submit.prevent="handleSubmit">
    <h2 class="heading-four">{{ site ? $t('site.form.editTitle') : $t('site.form.createTitle') }}</h2>
    <ui-field v-slot="{ id }" :label="$t('site.form.name')">
      <input :id="id" v-model="form.name" class="input" type="text" required />
    </ui-field>
    <ui-field v-if="!site" v-slot="{ id }" :label="$t('site.form.code')">
      <input :id="id" class="input uppercase" type="text" required maxlength="2" pattern="[A-Za-z]{2}" autocomplete="off" :value="form.code" @input="handleCodeInput" />
      <p class="body-three">{{ $t('site.form.codeHint') }}</p>
    </ui-field>
    <location-fields v-model="form.location" />
    <ui-field v-slot="{ id }" :label="$t('site.form.phone')">
      <input :id="id" v-model="form.phone" class="input" type="tel" autocomplete="off" />
    </ui-field>
    <p v-if="siteStore.hasSaveError" class="form-error" role="alert">{{ errorMessageComputed }}</p>
    <div class="flex justify-end gap-2">
      <button type="button" class="btn-secondary" @click="handleCancel">{{ $t('site.form.cancel') }}</button>
      <button type="submit" class="btn-primary" :disabled="siteStore.isSaving || !isLocationComplete(form.location)">{{ $t('site.form.save') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
// imports
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { siteErrorMessage } from 'site/composables/site-errors';
import { isLocationComplete, trimmedLocation } from 'territory/composables/location';
import { EMPTY_LOCATION } from 'territory/constants/provinces';
import type { ISite, ISiteForm } from 'site/types/site';

import LocationFields from 'territory/components/location-fields.vue';
import UiField from 'global/components/ui-field.vue';

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
const form = reactive<ISiteForm>({ code: '', name: '', location: { ...EMPTY_LOCATION }, phone: null });

// computed
const errorMessageComputed = computed((): string => siteErrorMessage(siteStore.saveErrorCode, t('site.form.error')));

// methods
const fillForm = (site?: ISite): void => {
  form.code = site?.code ?? '';
  form.name = site?.name ?? '';
  form.location = site ? { province: site.province, city: site.city, address: site.address } : { ...EMPTY_LOCATION };
  form.phone = site?.phone ?? null;
  siteStore.clearSaveError();
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

const handleSubmit = async (): Promise<void> => {
  const phone = form.phone?.trim() || null;
  const site = await siteStore.save({ code: form.code, name: form.name.trim(), location: trimmedLocation(form.location), phone }, props.site?.id);
  if (!site) return;
  toastStore.push(t('site.form.saved'), 'success');
  emit('saved', site);
};
</script>
