<template>
  <div>
    <transition name="fade-step" mode="out-in">
      <div v-if="!selectedProfile" key="list" class="stagger flex flex-col gap-8">
        <auth-heading :eyebrow="$t('auth.switch.eyebrow')" :title="$t('auth.switch.title')" :subtitle="$t('auth.switch.subtitle')" />

        <p v-if="!authStore.deviceProfiles.length" class="body-one">{{ $t('auth.switch.empty') }}</p>
        <ul v-else class="grid grid-cols-2 gap-3">
          <li v-for="profile in authStore.deviceProfiles" :key="profile.userId" class="relative">
            <button
              type="button"
              class="card flex w-full flex-col items-center gap-3 py-6 transition-[transform,box-shadow,border-color] duration-300
              ease-(--ease-premium) hover:-translate-y-0.5 hover:border-primary-olive-mid hover:shadow-md active:scale-[0.98]"
              @click="handleSelect(profile)"
            >
              <span
                class="flex h-14 w-14 items-center justify-center rounded-full bg-primary-olive-light text-lg
                  font-semibold text-primary-olive-dark"
              >
                {{ initials(profile) }}
              </span>
              <span class="text-center text-sm font-medium text-neutral-800">{{ profile.firstName }} {{ profile.lastName }}</span>
            </button>
            <button
              type="button"
              class="icon-btn absolute top-1 right-1"
              :aria-label="$t('auth.switch.forget', { name: profile.firstName })"
              @click="handleForget(profile)"
            >
              <close-line-icon class="h-4 w-4" />
            </button>
          </li>
        </ul>

        <router-link :to="{ name: 'auth-login' }" class="btn-secondary w-full">
          <user-add-line-icon class="h-5 w-5" />
          {{ $t('auth.switch.otherAccount') }}
        </router-link>
      </div>

      <div v-else :key="selectedProfile.userId" class="stagger flex flex-col gap-8">
        <auth-heading
          :eyebrow="$t('auth.switch.eyebrow')"
          :title="`${selectedProfile.firstName} ${selectedProfile.lastName}`"
          :subtitle="$t('auth.switch.enterPin')"
        />
        <pin-pad v-model="pin" :length="PIN_LENGTH" :is-disabled="isLoading" :has-error="!!errorMessage" @complete="handlePinComplete" />
        <p v-if="errorMessage" class="form-error text-center" role="alert">{{ errorMessage }}</p>
        <button type="button" class="link inline-flex items-center gap-1 self-center" @click="handleBack">
          <arrow-left-line-icon class="h-4 w-4" />
          {{ $t('auth.switch.back') }}
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAuthStore } from 'auth/stores/auth';
import { useAuthError } from 'auth/composables/use-auth-error';
import { PIN_LENGTH } from 'auth/constants/auth';
import type { IDeviceProfile } from 'auth/types/auth';

import AuthHeading from 'auth/components/auth-heading.vue';
import PinPad from 'auth/components/pin-pad.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import CloseLineIcon from 'global/icons/close-line.icon.vue';
import UserAddLineIcon from 'global/icons/user-add-line.icon.vue';

// stores
const authStore = useAuthStore();
const router = useRouter();
const { errorMessage, setError, clearError } = useAuthError();

// variables
const selectedProfile = ref<IDeviceProfile | null>(null);
const pin = ref('');
const isLoading = ref(false);

// methods
const initials = (profile: IDeviceProfile): string => `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase();

const unlock = async (value: string): Promise<void> => {
  if (!selectedProfile.value) return;
  clearError();
  isLoading.value = true;
  try {
    await authStore.unlockDeviceProfile(selectedProfile.value.userId, value);
    await router.replace({ name: 'dashboard' });
  } catch (error) {
    setError(error);
    pin.value = '';
  } finally {
    isLoading.value = false;
  }
};

// event handlers
const handleSelect = (profile: IDeviceProfile): void => {
  clearError();
  pin.value = '';
  selectedProfile.value = profile;
};

const handleForget = (profile: IDeviceProfile): void => {
  authStore.forgetDeviceProfile(profile.userId);
};

const handlePinComplete = (value: string): void => {
  unlock(value);
};

const handleBack = (): void => {
  selectedProfile.value = null;
};
</script>
