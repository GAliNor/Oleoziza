<template>
  <header class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
    <div class="flex min-w-0 items-center gap-5">
      <ui-avatar class="h-20 w-20 shrink-0 text-xl" :name="client.name" :variant="clientAvatarVariant(client.kind)" />
      <div class="flex min-w-0 flex-col gap-2">
        <h2 class="heading-two truncate">{{ client.name }}</h2>
        <p class="flex flex-wrap items-center gap-2">
          <span class="chip" :class="client.kind === 'company' ? 'bg-accent-subtle text-fg-accent' : 'bg-selected text-fg-brand'">{{ $t(`client.kinds.${client.kind}`) }}</span>
          <span class="chip" :class="FOLLOW_UP_TONES[client.followUp]">{{ $t(`client.record.followUp.${client.followUp}`) }}</span>
        </p>
      </div>
    </div>
    <dl class="flex shrink-0 gap-10 lg:text-end">
      <div class="flex flex-col gap-1">
        <dt class="eyebrow">{{ $t('client.record.oilStock') }}</dt>
        <dd class="figure text-display-xs text-fg-display">{{ formatLitres(client.oilStockLitres) }}</dd>
      </div>
      <div class="flex flex-col gap-1 border-l border-default ps-10">
        <dt class="eyebrow">{{ $t('client.record.owes') }}</dt>
        <dd class="figure text-display-xs" :class="isFinanceShown && client.balance ? 'text-fg-warning' : 'text-fg-display'">
          {{ isFinanceShown ? formatMoney(client.balance) : '—' }}
        </dd>
      </div>
    </dl>
  </header>
</template>

<script setup lang="ts">
// imports
import { formatMoney } from 'global/composables/money';
import { formatLitres } from 'lot/composables/quantity';
import { clientAvatarVariant } from 'client/composables/avatar-variant';
import type { ClientFollowUp, IClientRecord } from 'client/types/client';

import UiAvatar from 'global/components/ui-avatar.vue';

// props
defineProps<{ client: IClientRecord; isFinanceShown: boolean }>();

// variables
const FOLLOW_UP_TONES: Record<ClientFollowUp, string> = {
  active: 'bg-success-subtle text-fg-success',
  'at-risk': 'bg-warning-subtle text-fg-warning',
  inactive: 'bg-subtle text-fg-primary-paragraph',
};
</script>
