<template>
  <span class="chip" :class="STATUS_CLASSES[status]">{{ $t(`user.status.${status}`) }}</span>
</template>

<script setup lang="ts">
// imports
import type { StaffStatus } from 'user/types/user';

// props
defineProps<{ status: StaffStatus }>();

// variables
const STATUS_CLASSES: Record<StaffStatus, string> = {
  active: 'bg-success-subtle text-fg-success',
  invited: 'bg-info-subtle text-fg-info',
  disabled: 'bg-emphasis text-fg-primary-paragraph',
};
</script>
