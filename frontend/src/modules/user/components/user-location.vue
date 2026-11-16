<template>
  <div class="flex flex-col gap-1 sm:col-span-2">
    <div class="flex items-baseline justify-between gap-3">
      <dt class="label">{{ $t('user.detail.address') }}</dt>
      <button v-if="isEditable && !isEditing" type="button" class="link" @click="handleEdit">
        {{ $t(user.location ? 'user.location.edit' : 'user.location.add') }}
      </button>
    </div>
    <dd v-if="isEditing">
      <form class="mt-2 flex flex-col gap-4 rounded-card bg-subtle p-4" @submit.prevent="handleSave">
        <location-fields v-model="draft" />
        <p v-if="isIncomplete" class="form-error" role="alert">{{ $t('user.location.incomplete') }}</p>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="btn-secondary" @click="isEditing = false">{{ $t('user.form.cancel') }}</button>
          <button type="submit" class="btn-primary" :disabled="userStore.isSaving || isIncomplete">{{ $t('user.location.save') }}</button>
        </div>
      </form>
    </dd>
    <template v-else-if="user.location">
      <dd class="text-fg-display">{{ user.location.address }}, {{ user.location.city }}</dd>
      <dd class="body-two">{{ formatArea(territoryStore.findProvince(user.location.province)) }}</dd>
    </template>
    <dd v-else class="body-two">{{ $t('user.location.none') }}</dd>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useToastStore } from 'global/stores/toast';
import { useUserStore } from 'user/stores/user';
import { useUserRights } from 'user/composables/use-user-rights';
import { formatArea, isLocationComplete, trimmedLocation } from 'territory/composables/location';
import { useTerritoryStore } from 'territory/stores/territory';
import { EMPTY_LOCATION } from 'territory/constants/provinces';
import type { ILocation } from 'territory/types/territory';
import type { IStaffUser } from 'user/types/user';

import LocationFields from 'territory/components/location-fields.vue';

// props
const props = defineProps<{ user: IStaffUser }>();

// stores
const { t } = useI18n();
const toastStore = useToastStore();
const userStore = useUserStore();
const territoryStore = useTerritoryStore();
const { canEdit } = useUserRights();

// variables
const isEditing = ref(false);
const draft = ref<ILocation>({ ...EMPTY_LOCATION });

// computed
const isEditable = computed((): boolean => canEdit(props.user));
const isIncomplete = computed((): boolean => !isLocationComplete(draft.value));

// event handlers
const handleEdit = (): void => {
  draft.value = props.user.location ? { ...props.user.location } : { ...EMPTY_LOCATION };
  isEditing.value = true;
};

const handleSave = async (): Promise<void> => {
  if (isIncomplete.value) return;
  const isSaved = await userStore.setLocation(props.user.id, trimmedLocation(draft.value));
  if (!isSaved) {
    toastStore.push(t('user.detail.error'), 'danger');
    return;
  }
  toastStore.push(t('user.location.saved'), 'success');
  isEditing.value = false;
};

// lifecycle
onMounted(() => territoryStore.fetchProvinces());
</script>
