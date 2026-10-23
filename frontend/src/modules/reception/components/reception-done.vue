<template>
  <section class="rise mx-auto flex w-full max-w-md flex-col items-center gap-5 py-6 text-center">
    <span class="flex h-20 w-20 items-center justify-center rounded-full bg-primary-olive-light">
      <animated-check-icon class="h-10 w-10 text-primary-olive-dark" />
    </span>
    <div>
      <p class="eyebrow">{{ lot.code }} · {{ $t('reception.done.waiting') }}</p>
      <h2 class="display-one mt-1 tabular-nums">{{ formatKg(lot.netKg) }}</h2>
      <p class="body-one">{{ formatQuintals(lot.netKg) }} · {{ lot.clientName }}</p>
      <p v-if="lot.dailyPricePerKg !== null" class="body-two mt-1">
        {{ $t('reception.done.purchase', { price: formatDh(lot.dailyPricePerKg), amount: formatDh(lot.netKg * lot.dailyPricePerKg) }) }}
      </p>
    </div>
    <span v-if="lot.isPendingSync" class="chip bg-warning-amber/15 text-warning-amber">{{ $t('reception.pendingSync') }}</span>
    <div class="flex w-full flex-col gap-2">
      <button type="button" class="btn-primary min-h-14" @click="handlePrint">{{ $t('reception.done.print') }}</button>
      <div class="grid grid-cols-2 gap-2">
        <router-link :to="{ name: 'reception-new' }" class="btn-secondary">{{ $t('reception.done.again') }}</router-link>
        <router-link :to="{ name: 'dashboard' }" class="btn-secondary">{{ $t('reception.done.home') }}</router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { useI18n } from 'vue-i18n';

import { useToastStore } from 'global/stores/toast';
import { formatDh, formatKg, formatQuintals } from 'reception/composables/format';
import type { ILot } from 'reception/types/reception';

import AnimatedCheckIcon from 'global/icons/animated-check.icon.vue';

// props
const props = defineProps<{ lot: ILot }>();

// stores
const { t } = useI18n();
const toastStore = useToastStore();

// event handlers
const handlePrint = (): void => {
  toastStore.push(t('reception.done.printed', { code: props.lot.code }), 'success');
};
</script>
