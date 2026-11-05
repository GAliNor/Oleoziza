<template>
  <article class="card flex flex-col gap-3">
    <header class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <h2 class="heading-five truncate">{{ lot.clientName }}</h2>
        <p class="body-two">{{ lot.code }} · {{ lot.variety }} · {{ formatKg(lot.netKg) }}</p>
        <p class="body-two">{{ $t('lot.discount.givenBy', { name: lot.discount?.givenBy ?? '', date: formatDateTime(lot.discount?.givenAt ?? lot.receivedAt) }) }}</p>
      </div>
      <span class="chip shrink-0 bg-warning-subtle text-fg-warning tabular-nums">{{ $t('lot.discount.overLimit', { percent: formatNumber(lot.discount?.percent ?? 0, 2) }) }}</span>
    </header>

    <dl class="grid grid-cols-3 gap-2 rounded-card bg-subtle p-3">
      <div>
        <dt class="body-three">{{ $t('lot.discount.fullFee') }}</dt>
        <dd class="font-semibold text-fg-display tabular-nums">{{ formatMoney(fullFee(lot)) }}</dd>
      </div>
      <div>
        <dt class="body-three">{{ $t('lot.discount.discount') }}</dt>
        <dd class="font-semibold text-fg-warning tabular-nums">{{ formatMoney(lot.discount?.amountDh ?? 0) }}</dd>
      </div>
      <div>
        <dt class="body-three">{{ $t('lot.discount.after') }}</dt>
        <dd class="font-semibold text-fg-brand tabular-nums">{{ formatMoney(fullFee(lot) - (lot.discount?.amountDh ?? 0)) }}</dd>
      </div>
    </dl>

    <p v-if="!canDecide" class="body-two rounded-card bg-surface/70 p-3 text-center shadow-hairline">{{ $t('lot.discount.ownDiscount') }}</p>
    <form v-else-if="isRefusing" class="flex flex-col gap-2" @submit.prevent="handleRefuse">
      <ui-field v-slot="{ id }" :label="$t('lot.discount.reason')">
        <textarea :id="id" v-model="reason" class="input min-h-20" :placeholder="$t('lot.discount.reasonPlaceholder')" />
      </ui-field>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn-secondary" @click="isRefusing = false">{{ $t('lot.discount.cancel') }}</button>
        <button type="submit" class="btn-primary bg-danger hover:bg-danger/90" :disabled="!reason.trim() || isLocked">{{ $t('lot.discount.confirmRefuse') }}</button>
      </div>
    </form>
    <div v-else-if="!isReadOnly" class="grid grid-cols-2 gap-2">
      <button type="button" class="btn-secondary" :disabled="isLocked" @click="isRefusing = true">{{ $t('lot.discount.refuse') }}</button>
      <button type="button" class="btn-primary" :disabled="isLocked" @click="handleApprove">{{ $t('lot.discount.approve') }}</button>
    </div>
  </article>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { createId } from 'global/composables/crypto';
import { formatDateTime } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { formatNumber } from 'global/composables/number';
import { fullFee } from 'lot/composables/fee';
import { formatKg } from 'lot/composables/quantity';
import type { ILot } from 'lot/types/lot';

import UiField from 'global/components/ui-field.vue';

// props
const props = defineProps<{ lot: ILot; isReadOnly: boolean; isOnline: boolean }>();

// stores
const { t } = useI18n();
const lotStore = useLotStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();

// variables
const decisionId = createId();
const isRefusing = ref(false);
const reason = ref('');

// computed
const canDecide = computed((): boolean => sessionStore.canValidate(props.lot.discount?.givenBy ?? ''));
const isLocked = computed((): boolean => !props.isOnline || lotStore.isSaving);

// methods
const decide = async (isApproved: boolean): Promise<void> => {
  const client = props.lot.clientName;
  const updated = await lotStore.decideDiscount(props.lot, { id: decisionId, isApproved, reason: isApproved ? undefined : reason.value.trim() });
  if (updated) toastStore.push(t(isApproved ? 'lot.discount.approved' : 'lot.discount.refused', { client }), 'success');
  else toastStore.push(t('lot.discount.error'), 'danger');
};

// event handlers
const handleApprove = (): void => {
  decide(true);
};

const handleRefuse = (): void => {
  if (reason.value.trim()) decide(false);
};
</script>
