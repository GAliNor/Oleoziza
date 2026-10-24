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
  active: 'bg-success-green/10 text-success-green',
  invited: 'bg-info-blue/10 text-info-blue',
  disabled: 'bg-neutral-200 text-neutral-600',
};
</script>
