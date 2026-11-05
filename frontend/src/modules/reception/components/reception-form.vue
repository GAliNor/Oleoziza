<template>
  <reception-done v-if="finishedLot" :lot="finishedLot" @again="handleAgain" />

  <div v-else class="flex flex-col gap-6">
    <h1 class="heading-one">{{ $t('reception.open.title') }}</h1>

    <ui-empty-state v-if="receptionStore.hasError" class="card" tone="danger" size="compact" :message="$t('reception.loadError')">
      <template #action>
        <button type="button" class="btn-secondary" @click="handleRetry">{{ $t('reception.retry') }}</button>
      </template>
    </ui-empty-state>

    <section class="flex flex-col gap-2">
      <h2 class="label">{{ $t('reception.open.client') }}</h2>
      <div v-if="receptionStore.isLoading" class="skeleton h-14" />
      <client-picker v-else v-model="client" :site-id="siteId" @create="emit('create-client', $event)" />
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="label">{{ $t('reception.open.variety') }}</h2>
      <variety-picker v-model="variety" />
    </section>

    <ui-field v-slot="{ id }" :label="$t('reception.open.weight')">
      <div class="relative">
        <input
          :id="id"
          v-model.number="weightTyped"
          class="input pe-12 text-xl figure [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.1"
          :aria-invalid="isWeightTooHigh"
          @keydown.enter.prevent="handleSave"
        />
        <span class="pointer-events-none absolute top-1/2 inset-e-4 -translate-y-1/2 body-two">{{ $t('global.units.kilogram') }}</span>
      </div>
      <p v-if="isWeightTooHigh" class="form-error">{{ $t('reception.open.weightTooHigh', { max: formatKg(RECEPTION_MAX_KG) }) }}</p>
      <p v-else-if="netKg" class="body-two tabular-nums">{{ formatQuintals(netKg) }}</p>
    </ui-field>

    <reception-fee
      v-if="netKg && settings"
      :key="`fee-${receptionId}`"
      :net-kg="netKg"
      :rate-per-kg="settings.millingRatePerKg"
      :limit-percent="settings.discountLimitPercent"
      @update:discount="discount = $event"
    />

    <div v-if="receptionStore.isLoading || !settings" class="skeleton h-48" />
    <box-picker
      v-else
      :key="receptionId"
      v-model="boxNumbers"
      :box-count="settings.boxCount"
      :capacity-kg="settings.boxCapacityKg"
      :net-kg="netKg"
      :occupancy="occupancy"
    />

    <notification-choice-field v-model="notificationChoice" v-model:contact="contactTyped" :is-contact-missing="isContactMissing" :is-unchecked="isContactUnchecked" />

    <ui-photo-capture v-model="photo" :label="$t('reception.open.photo')" />

    <div class="flex flex-col gap-2">
      <button type="button" class="btn-primary min-h-14 text-md" :disabled="!canSave" @click="handleSave">
        {{ $t('reception.open.save') }}
      </button>
      <p v-if="missing.length" class="body-two text-center">{{ $t('reception.open.missing', { items: missing.join(', ') }) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useReceptionStore } from 'reception/stores/reception';
import { useClientStore } from 'client/stores/client';
import { useLotStore } from 'lot/stores/lot';
import { createId } from 'global/composables/crypto';
import { normalizePhone } from 'global/composables/phone';
import { useOnlineStatus } from 'global/composables/use-online-status';
import type { IDiscountFigures } from 'lot/composables/discount';
import { boxOccupancy } from 'lot/composables/lot-boxes';
import { formatKg, formatQuintals } from 'lot/composables/quantity';
import { OLIVE_VARIETIES, RECEPTION_MAX_KG } from 'reception/constants/reception';
import type { IClient } from 'client/types/client';
import type { ILot, NotificationChoice } from 'lot/types/lot';
import type { ISiteReceptionSettings } from 'reception/types/reception';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiField from 'global/components/ui-field.vue';
import UiPhotoCapture from 'global/components/ui-photo-capture.vue';
import BoxPicker from 'reception/components/box-picker.vue';
import ClientPicker from 'reception/components/client-picker.vue';
import NotificationChoiceField from 'reception/components/notification-choice.vue';
import ReceptionDone from 'reception/components/reception-done.vue';
import ReceptionFee from 'reception/components/reception-fee.vue';
import VarietyPicker from 'reception/components/variety-picker.vue';

// emits
const emit = defineEmits<{
  (event: 'create-client', query: string): void;
  (event: 'finished', isFinished: boolean): void;
}>();

// stores
const { t } = useI18n();
const route = useRoute();
const siteStore = useSiteStore();
const toastStore = useToastStore();
const receptionStore = useReceptionStore();
const clientStore = useClientStore();
const lotStore = useLotStore();
const { isOnline } = useOnlineStatus();

// variables
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const receptionId = ref(createId());
const client = ref<IClient | null>(null);
const variety = ref(OLIVE_VARIETIES[0].name);
const weightTyped = ref<number | ''>('');
const boxNumbers = ref<number[]>([]);
const photo = ref<string | null>(null);
const discount = ref<IDiscountFigures | null>(null);
const notificationChoice = ref<NotificationChoice | null>(null);
const contactTyped = ref('');
const finishedLot = ref<ILot | null>(null);

// computed
const siteId = computed((): string => siteStore.currentSite?.id ?? '');
const settings = computed((): ISiteReceptionSettings | null => receptionStore.settings);
const occupancy = computed((): Map<number, ILot> => boxOccupancy(lotStore.lots, siteId.value));
const isWeightTooHigh = computed((): boolean => typeof weightTyped.value === 'number' && weightTyped.value > RECEPTION_MAX_KG);
const netKg = computed((): number => {
  const typed = weightTyped.value;
  return typeof typed === 'number' && typed > 0 && !isWeightTooHigh.value ? Math.round(typed * 10) / 10 : 0;
});
const isContactMissing = computed((): boolean => {
  if (!client.value || notificationChoice.value === null || notificationChoice.value === 'none') return false;
  return notificationChoice.value === 'email' ? !client.value.email : !client.value.phone;
});
const isContactUnchecked = computed((): boolean => !isOnline.value && !!notificationChoice.value && notificationChoice.value !== 'none');
const isContactRequired = computed((): boolean => isContactMissing.value && isOnline.value);
const isContactValid = computed((): boolean => (notificationChoice.value === 'email' ? EMAIL_PATTERN.test(contactTyped.value.trim()) : !!normalizePhone(contactTyped.value)));
const missing = computed((): string[] =>
  [
    { isMissing: !client.value, key: 'client' },
    { isMissing: !netKg.value, key: 'weight' },
    { isMissing: !boxNumbers.value.length, key: 'box' },
    { isMissing: !notificationChoice.value, key: 'notification' },
    { isMissing: isContactRequired.value && !isContactValid.value, key: 'contact' },
    { isMissing: !!discount.value?.isTooHigh, key: 'discount' },
  ]
    .filter((item) => item.isMissing)
    .map((item) => t(`reception.open.missingItems.${item.key}`)),
);
const canSave = computed((): boolean => !missing.value.length && !!siteId.value && !!settings.value && !receptionStore.isSaving);

// watchers
watch(
  siteId,
  (value) => {
    if (!value) return;
    receptionStore.fetchSite(value);
    if (receptionStore.settings) receptionStore.refreshSettings(value);
  },
  { immediate: true },
);


watch(
  [() => route.query.client, () => clientStore.clients.length],
  ([clientId]) => {
    if (clientId && client.value?.id !== clientId) client.value = clientStore.clientById(String(clientId)) ?? client.value;
  },
  { immediate: true },
);

// event handlers
const handleRetry = (): void => {
  receptionStore.fetchSite(siteId.value, true);
};

const handleSave = async (): Promise<void> => {
  if (!canSave.value || !client.value || !notificationChoice.value) return;
  if (isContactRequired.value) {
    const contact = notificationChoice.value === 'email' ? { email: contactTyped.value.trim() } : { phone: normalizePhone(contactTyped.value) ?? '' };
    const updated = await clientStore.updateContact(client.value.id, contact);
    if (!updated) {
      toastStore.push(t('reception.saveError'), 'danger');
      return;
    }
    client.value = updated;
  }
  const lot = await receptionStore.receiveLot({
    id: receptionId.value,
    siteId: siteId.value,
    clientId: client.value.id,
    mode: 'service',
    variety: variety.value,
    netKg: netKg.value,
    millingRatePerKg: settings.value?.millingRatePerKg ?? 0,
    discount: discount.value && { amountDh: discount.value.amountDh, percent: discount.value.percent, state: discount.value.isOverLimit ? 'pending' : 'applied' },
    notificationChoice: notificationChoice.value,
    isContactMissing: isContactMissing.value && !isContactRequired.value,
    boxNumbers: boxNumbers.value,
    photoUrl: photo.value ?? undefined,
  });
  if (!lot) {
    toastStore.push(t('reception.saveError'), 'danger');
    return;
  }
  finishedLot.value = lot;
  emit('finished', true);
  window.scrollTo({ top: 0 });
};

const handleAgain = (): void => {
  finishedLot.value = null;
  receptionId.value = createId();
  client.value = null;
  variety.value = OLIVE_VARIETIES[0].name;
  weightTyped.value = '';
  boxNumbers.value = [];
  photo.value = null;
  discount.value = null;
  notificationChoice.value = null;
  contactTyped.value = '';
  emit('finished', false);
};
</script>
