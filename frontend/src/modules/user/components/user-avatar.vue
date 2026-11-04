<template>
  <ui-avatar
    :name="formatFullName(user)"
    :variant="STAFF_AVATAR_VARIANT"
    :fallback-class="user.role === 'management' ? 'bg-accent-brown text-white' : 'bg-selected text-fg-brand'"
  />
</template>

<script setup lang="ts">
// imports
import { formatFullName } from 'user/composables/format';
import { STAFF_AVATAR_VARIANT } from 'user/constants/user';
import type { IStaffUser } from 'user/types/user';

import UiAvatar from 'global/components/ui-avatar.vue';

// props
defineProps<{ user: Pick<IStaffUser, 'role' | 'firstName' | 'lastName'> }>();
</script>
