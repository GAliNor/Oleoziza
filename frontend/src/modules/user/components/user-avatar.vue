<template>
  <avatar-tag
    :name="formatFullName(user)"
    kind="user"
    :fallback-class="user.role === 'management' ? 'bg-accent-brown text-white' : 'bg-selected text-fg-brand'"
  />
</template>

<script setup lang="ts">
// imports
import { formatFullName } from 'user/composables/format';
import type { IStaffUser } from 'user/types/user';

import AvatarTag from 'global/components/avatar-tag.vue';

// props
defineProps<{ user: Pick<IStaffUser, 'role' | 'firstName' | 'lastName'> }>();
</script>
