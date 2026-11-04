<template>
  <div class="card min-w-0 overflow-x-auto rounded-2xl p-0">
    <table class="w-full text-sm">
      <thead class="bg-page text-left eyebrow">
        <tr>
          <th class="px-4 py-3 font-semibold">{{ $t('user.table.user') }}</th>
          <th class="hidden px-4 py-3 font-semibold md:table-cell">{{ $t('user.table.role') }}</th>
          <th class="hidden px-4 py-3 font-semibold lg:table-cell">{{ $t('user.table.sites') }}</th>
          <th class="hidden px-4 py-3 font-semibold lg:table-cell">{{ $t('user.table.lastLogin') }}</th>
          <th class="px-4 py-3 font-semibold">{{ $t('user.table.status') }}</th>
        </tr>
      </thead>
      <tbody class="stagger">
        <tr
          v-for="user in users"
          :key="user.id"
          class="cursor-pointer border-t border-subtle transition-colors hover:bg-page"
          :class="{ 'bg-selected/40': user.id === highlightedId }"
          tabindex="0"
          @click="emit('open', user.id)"
          @keydown.enter="emit('open', user.id)"
        >
          <td class="px-4 py-3">
            <div class="flex items-center gap-3">
              <user-avatar :user="user" class="h-9 w-9" />
              <div class="min-w-0">
                <p class="truncate font-medium" :class="user.status === 'disabled' ? 'text-fg-muted' : 'text-fg-display'">{{ formatFullName(user) }}</p>
                <p class="body-two truncate">{{ user.email ?? formatPhone(user.phone ?? '') }}</p>
              </div>
            </div>
          </td>
          <td class="hidden px-4 py-3 whitespace-nowrap text-fg-primary-paragraph md:table-cell">
            {{ $t(`user.roles.${user.role}`) }}
            <span v-if="user.isOwner" class="chip ml-1 bg-highlight/30 text-fg-accent">{{ $t('user.owner') }}</span>
          </td>
          <td class="hidden px-4 py-3 lg:table-cell">
            <span v-for="siteId in Object.keys(user.sites)" :key="siteId" class="chip mr-1 bg-subtle text-fg-primary-paragraph">{{ siteCity(siteId) }}</span>
          </td>
          <td class="hidden px-4 py-3 whitespace-nowrap text-fg-primary-paragraph lg:table-cell">
            {{ user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—' }}
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <user-status-chip :status="user.status" />
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!users.length" class="body-two px-5 py-8 text-center">{{ $t('user.empty') }}</p>
  </div>
</template>

<script setup lang="ts">
// imports
import { useSiteStore } from 'site/stores/site';
import { formatPhone } from 'global/composables/phone';
import { formatFullName } from 'user/composables/format';
import type { IStaffUser } from 'user/types/user';
import { formatDateTime } from 'global/composables/date';

import UserAvatar from 'user/components/user-avatar.vue';
import UserStatusChip from 'user/components/user-status-chip.vue';

// props
defineProps<{ users: IStaffUser[]; highlightedId: string | null }>();

// emits
const emit = defineEmits<{ (event: 'open', id: string): void }>();

// stores
const siteStore = useSiteStore();

// methods
const siteCity = (siteId: string): string => siteStore.sites.find((site) => site.id === siteId)?.city ?? '—';
</script>
