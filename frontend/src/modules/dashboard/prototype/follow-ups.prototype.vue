<template>
  <div class="card flex flex-col gap-3 rounded-2xl p-5">
    <h2 class="heading-two">Clients à suivre</h2>
    <ul class="flex flex-col divide-y divide-neutral-100">
      <li v-for="item in FOLLOW_UPS" :key="item.client" class="flex items-center justify-between gap-3 py-2.5">
        <div class="min-w-0">
          <p class="truncate font-medium text-neutral-900">{{ item.client }}</p>
          <p class="body-two truncate">{{ item.note }}</p>
        </div>
        <span class="chip shrink-0" :class="STATE_CLASSES[item.state]">{{ STATE_LABELS[item.state] }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — "Clients to follow up" block from reference 16 (ticket 0019).
// imports
import { FOLLOW_UPS, type IFollowUpPrototype } from 'dashboard/prototype/mock-home.prototype';

// variables
const STATE_LABELS: Record<IFollowUpPrototype['state'], string> = { active: 'Actif', 'at-risk': 'À relancer', inactive: 'Inactif' };
const STATE_CLASSES: Record<IFollowUpPrototype['state'], string> = {
  active: 'bg-success-green/10 text-success-green',
  'at-risk': 'bg-accent-gold/30 text-accent-brown',
  inactive: 'bg-neutral-100 text-neutral-600',
};
</script>
