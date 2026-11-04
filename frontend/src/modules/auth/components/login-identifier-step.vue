<template>
  <div class="stagger flex flex-col gap-8">
    <auth-heading :eyebrow="$t('auth.login.eyebrow')" :title="$t('auth.login.title')" :subtitle="$t('auth.login.subtitle')" />

    <identifier-form v-model="identifier" :submit-label="$t('auth.login.continue')" :is-loading="isLoading" :error-message="errorMessage" @submit="emit('submit')" />

    <router-link v-if="deviceProfileStore.profiles.length" :to="{ name: 'auth-switch' }" class="link self-center">
      {{ $t('auth.switch.action') }}
    </router-link>
  </div>
</template>

<script setup lang="ts">
// imports
import { useDeviceProfileStore } from 'auth/stores/device-profile';

import AuthHeading from 'auth/components/auth-heading.vue';
import IdentifierForm from 'auth/components/identifier-form.vue';

// props
defineProps<{ isLoading: boolean; errorMessage: string }>();

// emits
const emit = defineEmits<{ submit: [] }>();

// stores
const deviceProfileStore = useDeviceProfileStore();

// variables
const identifier = defineModel<string>({ required: true });
</script>
