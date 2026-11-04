<template>
  <form class="card flex flex-col gap-4 rounded-2xl" @submit.prevent="handleSubmit">
    <h2 class="heading-four">{{ site ? $t('site.form.editTitle') : $t('site.form.createTitle') }}</h2>
    <ui-field v-slot="{ id }" :label="$t('site.form.name')">
      <input :id="id" v-model="form.name" class="input" type="text" required />
    </ui-field>
    <ui-field v-slot="{ id }" :label="$t('site.form.city')">
      <input :id="id" v-model="form.city" class="input" type="text" required />
    </ui-field>
    <p v-if="siteStore.hasSaveError" class="form-error" role="alert">{{ $t('site.form.error') }}</p>
    <div class="flex justify-end gap-2">
      <button type="button" class="btn-secondary" @click="handleCancel">{{ $t('site.form.cancel') }}</button>
      <button type="submit" class="btn-primary" :disabled="siteStore.isSaving">{{ $t('site.form.save') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
// imports
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import type { ISite } from 'site/types/site';
import type { ISiteForm } from 'site/types/site';

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
const form = reactive<ISiteForm>({ name: '', city: '' });

// methods
const fillForm = (site?: ISite): void => {
  form.name = site?.name ?? '';
  form.city = site?.city ?? '';
  siteStore.clearSaveError();
};

// watchers
watch(() => props.site, fillForm, { immediate: true });

// event handlers
const handleCancel = (): void => {
  fillForm(props.site);
  emit('cancel');
};

const handleSubmit = async (): Promise<void> => {
  const site = await siteStore.save({ name: form.name.trim(), city: form.city.trim() }, props.site?.id);
  if (!site) return;
  toastStore.push(t('site.form.saved'), 'success');
  emit('saved', site);
};
</script>
