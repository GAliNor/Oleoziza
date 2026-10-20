<template>
  <app-layout>
    <section class="flex flex-col gap-6">
      <div>
        <h1 class="heading-one">{{ $t('site.title') }}</h1>
        <p class="body-two">{{ $t('site.subtitle') }}</p>
      </div>

      <div class="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <ul class="flex flex-col gap-3">
          <li v-for="site in siteStore.sites" :key="site.id" class="card flex items-center gap-3">
            <map-pin-line-icon class="h-6 w-6 text-accent-rust" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-neutral-800">{{ site.name }}</p>
              <p class="body-two">{{ site.city }}</p>
            </div>
            <button type="button" class="btn-secondary" @click="handleEdit(site)">{{ $t('site.edit') }}</button>
          </li>
        </ul>

        <form class="card flex flex-col gap-4 self-start" @submit.prevent="handleSubmit">
          <h2 class="heading-two">{{ editedSiteId ? $t('site.form.editTitle') : $t('site.form.createTitle') }}</h2>
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
            <button v-if="editedSiteId" type="button" class="btn-secondary" @click="handleCancel">
              {{ $t('site.form.cancel') }}
            </button>
            <button type="submit" class="btn-primary" :disabled="siteAdminStore.isSaving">{{ $t('site.form.save') }}</button>
          </div>
        </form>
      </div>
    </section>
  </app-layout>
</template>

<script setup lang="ts">
// imports
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSiteStore } from 'global/stores/site';
import { useSiteAdminStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import type { ISite } from 'global/types/site';
import type { ISiteForm } from 'site/types/site';

import AppLayout from 'global/components/app-layout.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';

// stores
const siteStore = useSiteStore();
const siteAdminStore = useSiteAdminStore();
const toastStore = useToastStore();
const { t } = useI18n();

// variables
const editedSiteId = ref<string | null>(null);
const form = reactive<ISiteForm>({ name: '', city: '' });

// methods
const resetForm = (): void => {
  editedSiteId.value = null;
  form.name = '';
  form.city = '';
};

// event handlers
const handleEdit = (site: ISite): void => {
  editedSiteId.value = site.id;
  form.name = site.name;
  form.city = site.city;
};

const handleCancel = (): void => {
  resetForm();
};

const handleSubmit = async (): Promise<void> => {
  const isSaved = await siteAdminStore.save({ name: form.name.trim(), city: form.city.trim() }, editedSiteId.value ?? undefined);
  if (!isSaved) return;
  toastStore.push(t('site.form.saved'), 'success');
  resetForm();
};
</script>
