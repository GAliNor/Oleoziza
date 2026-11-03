<template>
  <details class="rounded-2xl border border-dashed border-accent bg-accent-subtle p-4">
    <summary class="cursor-pointer label text-fg-accent">{{ $t('auth.demo.title') }}</summary>
    <ul class="mt-3 flex flex-col gap-1">
      <li v-for="user in DEMO_USERS" :key="user.id">
        <button
          type="button"
          class="flex w-full flex-col rounded-lg px-2 py-1.5 text-left hover:bg-surface"
          @click="handleSelect(user)"
        >
          <span class="label">
            {{ user.firstName }} {{ user.lastName }} · {{ $t(`auth.roles.${user.role}`) }}
          </span>
          <span class="body-two">{{ user.email ?? formatPhone(user.phone ?? '') }} · {{ user.hint }}</span>
        </button>
      </li>
    </ul>
  </details>
</template>

<script setup lang="ts">
// imports
import { USERS_MOCK } from 'auth/constants/mock-auth';
import { formatPhone } from 'global/composables/phone';
import type { IMockUser } from 'auth/types/mock-auth';

// emits
const emit = defineEmits<{ (event: 'select', identifier: string): void }>();

// variables
const DEMO_USERS = USERS_MOCK.filter((user) => user.hint);

// event handlers
const handleSelect = (user: IMockUser): void => {
  emit('select', user.email ?? formatPhone(user.phone ?? ''));
};
</script>
