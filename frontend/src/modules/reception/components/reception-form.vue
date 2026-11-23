<template>
  <reception-done v-if="finishedLot" :received-lot="finishedLot" @again="handleAgain" />

  <div v-else-if="settings && !settings.isSeasonOpen" class="flex flex-col gap-6">
    <h1 class="heading-one">{{ $t('reception.open.title') }}</h1>
    <no-open-season action="reception" />
  </div>

  <div v-else :ref="setFormRoot" class="flex flex-col gap-6">
    <h1 class="heading-one">{{ $t('reception.open.title') }}</h1>

    <ui-empty-state v-if="receptionStore.hasError" class="card" tone="danger" size="compact" :message="$t('reception.loadError')">
      <template #action>
        <button type="button" class="btn-secondary" @click="handleRetry">{{ $t('reception.retry') }}</button>
      </template>
    </ui-empty-state>

    <section class="flex flex-col gap-2" data-field="client">
      <h2 class="label">{{ $t('reception.open.client') }}</h2>
      <div v-if="receptionStore.isLoading" class="skeleton h-14" />
      <client-picker v-else v-model="client" :site-id="siteId" @create="emit('create-client', $event)" />
      <p v-if="errorOf('client')" class="form-error" role="alert">{{ errorOf('client') }}</p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="label">{{ $t('reception.open.variety') }}</h2>
      <variety-picker v-model="variety" />
    </section>

    <ui-field v-slot="{ id, describedBy, isInvalid }" name="weight" :label="$t('reception.open.weight')" :error="errorOf('weight')" :is-valid="isValid('weight')" :hint="netKg ? formatQuintals(netKg) : undefined" @leave="touch('weight')">
      <div class="relative">
        <input
          :id="id"
          v-model.number="weightTyped"
          class="input pe-12 text-xl figure [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.1"
          :aria-invalid="isInvalid"
          :aria-describedby="describedBy"
          @keydown.enter.prevent="handleSave"
        />
        <span class="pointer-events-none absolute top-1/2 inset-e-4 -translate-y-1/2 body-two">{{ $t('global.units.kilogram') }}</span>
      </div>
    </ui-field>

    <div data-field="box" class="flex flex-col gap-2">
      <div v-if="receptionStore.isLoading || !settings" class="skeleton h-48" />
      <box-picker
        v-else
        :key="receptionId"
        v-model="boxNumbers"
        v-model:ignored="areBoxesIgnored"
        :box-count="settings.boxCount"
        :capacity-kg="settings.boxCapacityKg"
        :net-kg="netKg"
        :occupancy="occupancy"
      />
      <p v-if="errorOf('box')" class="form-error" role="alert">{{ errorOf('box') }}</p>
    </div>

    <div v-if="settings" data-field="line" class="flex flex-col gap-2">
      <line-picker :key="`line-${receptionId}`" v-model:line="pressLineId" v-model:start="plannedStartAt" v-model:later="isLineLater" :lines="settings.pressLines" :lots="siteLots" />
      <p v-if="errorOf('line')" class="form-error" role="alert">{{ errorOf('line') }}</p>
    </div>

    <div v-if="channelsComputed.length" data-field="notification" class="flex flex-col gap-2">
      <notification-choice-field
        v-model="notificationChoice"
        v-model:contact="contactTyped"
        :channels="channelsComputed"
        :is-contact-missing="isContactMissing"
        :is-unchecked="isContactUnchecked"
        :contact-error="errorOf('contact')"
        @contact-leave="touch('contact')"
      />
      <p v-if="errorOf('notification')" class="form-error" role="alert">{{ errorOf('notification') }}</p>
    </div>

    <ui-photo-capture v-model="photo" :label="$t('reception.open.photo')" />

    <ui-form-bar :problems="problemsComputed" :is-attempted="isAttempted" :is-busy="receptionStore.isSaving" :is-disabled="!siteId || !settings" :submit-label="$t('reception.open.save')" @jump="jumpTo" @submit="handleSave" />
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
import { useConfigurationStore } from 'configuration/stores/configuration';
import { createId } from 'global/composables/crypto';
import { normalizePhone } from 'global/composables/phone';
import { useFormFeedback } from 'global/composables/use-form-feedback';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { boxOccupancy } from 'lot/composables/lot-boxes';
import { formatKg, formatQuintals } from 'lot/composables/quantity';
import { OLIVE_VARIETIES, RECEPTION_MAX_KG } from 'reception/constants/reception';
import type { IFormRule } from 'global/types/form';
import type { IClient } from 'client/types/client';
import type { ILot, NotificationChoice } from 'lot/types/lot';
import type { NotificationChannel } from 'configuration/types/configuration';
import type { ISiteReceptionSettings } from 'reception/types/reception';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiField from 'global/components/ui-field.vue';
import UiFormBar from 'global/components/ui-form-bar.vue';
import UiPhotoCapture from 'global/components/ui-photo-capture.vue';
import NoOpenSeason from 'season/components/no-open-season.vue';
import BoxPicker from 'reception/components/box-picker.vue';
import ClientPicker from 'reception/components/client-picker.vue';
import LinePicker from 'reception/components/line-picker.vue';
import NotificationChoiceField from 'reception/components/notification-choice.vue';
import ReceptionDone from 'reception/components/reception-done.vue';
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
const configurationStore = useConfigurationStore();
const { isOnline } = useOnlineStatus();

// variables
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const receptionId = ref(createId());
const client = ref<IClient | null>(null);
const variety = ref(OLIVE_VARIETIES[0].name);
const weightTyped = ref<number | ''>('');
const boxNumbers = ref<number[]>([]);
const areBoxesIgnored = ref(false);
const photo = ref<string | null>(null);
const notificationChoice = ref<NotificationChoice | null>(null);
const contactTyped = ref('');
const finishedLot = ref<ILot | null>(null);
const pressLineId = ref('');
const plannedStartAt = ref('');
const isLineLater = ref(false);

// computed
const channelsComputed = computed((): NotificationChannel[] => configurationStore.enabledNotificationChannels);
const siteId = computed((): string => siteStore.currentSite?.id ?? '');
const settings = computed((): ISiteReceptionSettings | null => receptionStore.settings);
const siteLots = computed((): ILot[] => lotStore.lots.filter((lot) => lot.siteId === siteId.value));
const occupancy = computed((): Map<number, ILot> => boxOccupancy(lotStore.lots, siteId.value));
const isWeightTooHigh = computed((): boolean => typeof weightTyped.value === 'number' && weightTyped.value > RECEPTION_MAX_KG);
const netKg = computed((): number => {
  const typed = weightTyped.value;
  return typeof typed === 'number' && typed > 0 && !isWeightTooHigh.value ? Math.round(typed * 10) / 10 : 0;
});
const isBoxRoomShort = computed((): boolean => !areBoxesIgnored.value && (!boxNumbers.value.length || boxNumbers.value.length * (settings.value?.boxCapacityKg ?? 0) < netKg.value));
const isLineMissing = computed((): boolean => !isLineLater.value && (!pressLineId.value || !plannedStartAt.value));
const isContactMissing = computed((): boolean => {
  if (!client.value || notificationChoice.value === null || notificationChoice.value === 'none') return false;
  return notificationChoice.value === 'email' ? !client.value.email : !client.value.phone;
});
const isContactUnchecked = computed((): boolean => !isOnline.value && !!notificationChoice.value && notificationChoice.value !== 'none');
const isContactRequired = computed((): boolean => isContactMissing.value && isOnline.value);
const isContactValid = computed((): boolean => (notificationChoice.value === 'email' ? EMAIL_PATTERN.test(contactTyped.value.trim()) : !!normalizePhone(contactTyped.value)));
const rulesComputed = computed((): IFormRule[] => [
  { key: 'client', label: t('reception.open.fields.client'), isMissing: !client.value, error: client.value ? null : t('reception.open.errors.client'), isFilled: !!client.value },
  {
    key: 'weight',
    label: t('reception.open.fields.weight'),
    isMissing: !netKg.value && !isWeightTooHigh.value,
    error: isWeightTooHigh.value ? t('reception.open.weightTooHigh', { max: formatKg(RECEPTION_MAX_KG) }) : netKg.value ? null : t('reception.open.errors.weight'),
    isFilled: !!netKg.value,
  },
  { key: 'box', label: t('reception.open.fields.box'), isMissing: isBoxRoomShort.value, error: isBoxRoomShort.value ? t('reception.open.errors.box') : null },
  { key: 'line', label: t('reception.open.fields.line'), isMissing: isLineMissing.value, error: isLineMissing.value ? t('reception.open.errors.line') : null },
  ...(channelsComputed.value.length ? [{ key: 'notification', label: t('reception.open.fields.notification'), isMissing: !notificationChoice.value, error: notificationChoice.value ? null : t('reception.open.errors.notification') }] : []),
  ...(isContactRequired.value ? [{ key: 'contact', label: t('reception.open.fields.contact'), isMissing: !contactTyped.value.trim(), error: isContactValid.value ? null : t(notificationChoice.value === 'email' ? 'global.form.emailInvalid' : 'global.form.phoneInvalid') }] : []),
]);

const { setFormRoot, problemsComputed, isAttempted, errorOf, isValid, touch, jumpTo, attempt, reset } = useFormFeedback(() => rulesComputed.value);

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


/** With no channel enabled the question is hidden and « Aucune » saved; once one is enabled, the Operator must choose again. */
watch(
  channelsComputed,
  (channels, previous) => {
    const choice = notificationChoice.value;
    if (!channels.length) notificationChoice.value = 'none';
    else if (previous && !previous.length && choice === 'none') notificationChoice.value = null;
    else if (choice && choice !== 'none' && !channels.includes(choice)) notificationChoice.value = null;
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

// methods
const defaultChoice = (): NotificationChoice | null => (channelsComputed.value.length ? null : 'none');

// event handlers
const handleRetry = (): void => {
  receptionStore.fetchSite(siteId.value, true);
};

const save = async (): Promise<void> => {
  if (!client.value || !notificationChoice.value || !siteId.value || !settings.value || receptionStore.isSaving) return;
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
    mode: 'service_milling',
    variety: variety.value,
    netKg: netKg.value,
    millingRatePerKg: settings.value?.millingRatePerKg ?? 0,
    notificationChoice: notificationChoice.value,
    isContactMissing: isContactMissing.value && !isContactRequired.value,
    boxNumbers: boxNumbers.value,
    areBoxesIgnored: areBoxesIgnored.value,
    pressLineId: isLineLater.value ? null : pressLineId.value,
    plannedStartAt: isLineLater.value ? null : plannedStartAt.value,
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

const handleSave = (): void => attempt(save);

const handleAgain = (): void => {
  finishedLot.value = null;
  receptionId.value = createId();
  client.value = null;
  variety.value = OLIVE_VARIETIES[0].name;
  weightTyped.value = '';
  boxNumbers.value = [];
  areBoxesIgnored.value = false;
  photo.value = null;
  notificationChoice.value = defaultChoice();
  contactTyped.value = '';
  pressLineId.value = '';
  plannedStartAt.value = '';
  isLineLater.value = false;
  reset();
  emit('finished', false);
};
</script>
