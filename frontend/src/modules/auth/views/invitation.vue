<template>
  <div>
    <transition name="fade-step" mode="out-in">
      <div v-if="isLoading && !invitation" key="loading" class="flex flex-col gap-3">
        <div class="skeleton h-6 w-1/3" />
        <div class="skeleton h-9 w-3/4" />
        <div class="skeleton h-40" />
      </div>

      <div v-else-if="invitation" key="form" class="stagger flex flex-col gap-8">
        <auth-heading
          :eyebrow="$t('auth.invitation.eyebrow')"
          :title="$t('auth.invitation.title', { firstName: invitation.firstName })"
          :subtitle="$t(`auth.invitation.subtitle.${invitation.credentialKind}`, { invitedBy: invitation.invitedBy })"
        />
        <credential-form
          :kind="invitation.credentialKind"
          :submit-label="$t('auth.invitation.accept')"
          :is-submitting="isLoading"
          @submit="handleSubmit"
        />
        <p v-if="errorMessage" class="form-error text-center" role="alert">{{ errorMessage }}</p>
      </div>

      <div v-else key="invalid" class="stagger flex flex-col gap-8">
        <auth-heading :eyebrow="$t('auth.invitation.eyebrow')" :title="$t('auth.invitation.invalidTitle')" :subtitle="errorMessage" />
        <router-link :to="{ name: 'auth-login' }" class="btn-primary w-full">{{ $t('auth.backToLogin') }}</router-link>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
// imports
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useAuthError } from 'auth/composables/use-auth-error';
import type { IInvitation } from 'auth/types/auth';

import AuthHeading from 'auth/components/auth-heading.vue';
import CredentialForm from 'auth/components/credential-form.vue';

// stores
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { errorMessage, setError, clearError } = useAuthError();

// variables
const token = String(route.params.token);
const invitation = ref<IInvitation | null>(null);
const isLoading = ref(true);

// methods
const fetchInvitation = async (): Promise<void> => {
  try {
    invitation.value = await authStore.getInvitation(token);
  } catch (error) {
    setError(error);
  } finally {
    isLoading.value = false;
  }
};

// event handlers
const handleSubmit = async (secret: string): Promise<void> => {
  clearError();
  isLoading.value = true;
  try {
    await authStore.acceptInvitation(token, secret);
    await router.replace({ name: 'dashboard' });
  } catch (error) {
    setError(error);
  } finally {
    isLoading.value = false;
  }
};

// lifecycle
onMounted(() => {
  fetchInvitation();
});
</script>
