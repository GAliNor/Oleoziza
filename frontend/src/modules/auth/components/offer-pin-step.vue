<template>
  <div class="stagger flex flex-col gap-8">
    <auth-heading :eyebrow="$t('auth.login.eyebrow')" :title="$t('auth.offerPin.title')" :subtitle="$t('auth.offerPin.subtitle')" />
    <credential-form kind="pin" :submit-label="$t('auth.offerPin.save')" :is-submitting="isLoading" @submit="emit('submit', $event)" />
    <p v-if="errorMessage" class="form-error text-center" role="alert">{{ errorMessage }}</p>
    <button type="button" class="link self-center" @click="emit('skip')">{{ $t('auth.offerPin.later') }}</button>
  </div>
</template>

<script setup lang="ts">
// imports
import AuthHeading from 'auth/components/auth-heading.vue';
import CredentialForm from 'auth/components/credential-form.vue';

// props
defineProps<{ isLoading: boolean; errorMessage: string }>();

// emits
const emit = defineEmits<{
  (event: 'submit', pin: string): void;
  (event: 'skip'): void;
}>();
</script>
