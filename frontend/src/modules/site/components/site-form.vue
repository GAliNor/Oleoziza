<template>
  <form class="card flex flex-col gap-4 rounded-2xl" @submit.prevent="handleSubmit">
    <h2 class="heading-two">{{ site ? $t('site.form.editTitle') : $t('site.form.createTitle') }}</h2>
    <div class="flex flex-col gap-1.5">
      <label class="label" for="site-name">{{ $t('site.form.name') }}</label>
      <input id="site-name" v-model="form.name" class="input" type="text" required />
    </div>
    <div class="flex flex-col gap-1.5">
      <label class="label" for="site-city">{{ $t('site.form.city') }}</label>
      <input id="site-city" v-model="form.city" class="input" type="text" required />
    </div>
    <p v-if="siteAdminStore.hasError" class="form-error" role="alert">{{ $t('site.form.error') }}</p>
    <div class="flex justify-end gap-2">
      <button type="button" class="btn-secondary" @click="handleCancel">{{ $t('site.form.cancel') }}</button>
      <button type="submit" class="btn-primary" :disabled="siteAdminStore.isSaving">{{ $t('site.form.save') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
// imports
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSiteAdminStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import type { ISite } from 'global/types/site';
import type { ISiteForm } from 'site/types/site';

// props
const props = defineProps<{ site?: ISite }>();

// emits
const emit = defineEmits<{
  (event: 'saved', site: ISite): void;
  (event: 'cancel'): void;
}>();

// stores
const siteAdminStore = useSiteAdminStore();
const toastStore = useToastStore();
const { t } = useI18n();

// variables
const form = reactive<ISiteForm>({ name: '', city: '' });

// methods
const fillForm = (site?: ISite): void => {
  form.name = site?.name ?? '';
  form.city = site?.city ?? '';
  siteAdminStore.clearError();
};

// watchers
watch(() => props.site, fillForm, { immediate: true });

// event handlers
const handleCancel = (): void => {
  fillForm(props.site);
  emit('cancel');
};

const handleSubmit = async (): Promise<void> => {
  const site = await siteAdminStore.save({ name: form.name.trim(), city: form.city.trim() }, props.site?.id);
  if (!site) return;
  toastStore.push(t('site.form.saved'), 'success');
  emit('saved', site);
};
</script>
