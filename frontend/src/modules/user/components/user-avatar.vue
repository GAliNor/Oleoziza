<template>
  <span class="avatar" :class="user.role === 'management' ? 'bg-accent-brown text-white' : 'bg-primary-olive-light text-primary-olive-dark'">
    {{ formatInitials(user) }}
  </span>
</template>

<script setup lang="ts">
// imports
import { formatInitials } from 'user/composables/format';
import type { IStaffUser } from 'user/types/user';

// props
defineProps<{ user: Pick<IStaffUser, 'role' | 'firstName' | 'lastName'> }>();
</script>
