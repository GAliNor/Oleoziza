<template>
  <div class="grid gap-4" :class="{ 'lg:grid-cols-2': sites.length > 1 }">
    <section v-for="site in sites" :key="site.id" class="card flex min-w-0 flex-col gap-4 rounded-2xl bg-neutral-50">
      <header class="flex items-center gap-2">
        <map-pin-line-icon class="h-5 w-5 shrink-0 text-accent-rust" />
        <h2 class="truncate font-semibold text-neutral-900">{{ site.name }}</h2>
        <span class="body-two ml-auto shrink-0 tabular-nums">{{ $t('user.teams.count', teamOf(site.id).length) }}</span>
      </header>
      <div v-for="role in ROLE_ORDER" :key="role" class="flex flex-col gap-2">
        <p class="eyebrow">{{ $t(`user.teams.${role}`) }}</p>
        <p v-if="!teamOf(site.id, role).length" class="body-two">{{ $t('user.teams.none') }}</p>
        <div class="stagger grid gap-2 sm:grid-cols-2">
          <button
            v-for="user in teamOf(site.id, role)"
            :key="user.id"
            type="button"
            class="flex min-w-0 items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm
              transition duration-300 ease-(--ease-premium) hover:-translate-y-0.5 hover:shadow-md"
            :class="{ 'ring-2 ring-primary-olive-light': user.id === highlightedId, 'opacity-60': user.status === 'disabled' }"
            @click="emit('open', user.id)"
          >
            <user-avatar :user="user" class="h-10 w-10" />
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-neutral-900">{{ formatFullName(user) }}</span>
              <span class="block truncate text-xs text-neutral-500">{{ $t('user.teams.rights', user.sites[site.id]?.length ?? 0) }}</span>
            </span>
            <span v-if="user.isOwner" class="chip shrink-0 bg-accent-gold/30 text-accent-brown">{{ $t('user.owner') }}</span>
            <user-status-chip v-else-if="user.status !== 'active'" :status="user.status" class="shrink-0" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// imports
import { formatFullName } from 'user/composables/format';
import type { ISite } from 'global/types/site';
import type { IStaffUser, StaffRole } from 'user/types/user';

import UserAvatar from 'user/components/user-avatar.vue';
import UserStatusChip from 'user/components/user-status-chip.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';

// props
const props = defineProps<{ users: IStaffUser[]; sites: ISite[]; highlightedId: string | null }>();

// emits
const emit = defineEmits<{ (event: 'open', id: string): void }>();

// variables
const ROLE_ORDER: StaffRole[] = ['management', 'operator'];

// methods
const teamOf = (siteId: string, role?: StaffRole): IStaffUser[] =>
  props.users.filter((user) => siteId in user.sites && (!role || user.role === role));
</script>
