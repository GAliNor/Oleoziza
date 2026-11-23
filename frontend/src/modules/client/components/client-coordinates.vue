<template>
  <section class="card grid min-w-0 overflow-hidden p-0 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
    <div class="@container flex min-w-0 flex-col">
      <ui-section-header class="border-b border-subtle px-4 py-3" :title="$t('client.coordinates.title')" :icon="IdCardLineIcon" tone="olive" />
      <ui-property-list class="p-2">
        <ui-property :label="$t('client.coordinates.phone')" :icon="PhoneLineIcon" :is-locked="!canEdit" :problem="phoneProblemComputed" :save="savePhone" @start="phone = formatPhone(client.phone)">
          <a class="link font-medium tabular-nums" :href="`tel:${client.phone}`" @click.stop>{{ formatPhone(client.phone) }}</a>
          <template #editor><ui-phone-input v-model="phone" class="min-h-11" /></template>
        </ui-property>
        <ui-property :label="$t('client.coordinates.email')" :icon="MailLineIcon" :is-locked="!canEdit" :is-empty="!client.email" :empty-label="$t('client.coordinates.noEmail')" is-optional :problem="emailProblemComputed" :save="saveEmail" @start="email = client.email ?? ''">
          <a class="link font-medium" :href="`mailto:${client.email}`" @click.stop>{{ client.email }}</a>
          <template #editor><input v-model="email" class="input min-h-11" type="email" inputmode="email" /></template>
        </ui-property>
        <ui-property v-if="client.identifier" :label="$t(`client.identifierKinds.${client.kind}`)" :icon="IdCardLineIcon">
          <span class="tabular-nums">{{ client.identifier }}</span>
        </ui-property>
        <ui-property :label="$t('client.coordinates.address')" :icon="MapPinLineIcon" :is-locked="!canEdit" :is-empty="!placeComputed" :empty-label="$t('client.quick.addPlace')" is-optional is-explicit :save="savePlace" @start="handleStartPlace">
          <span>{{ placeComputed }}</span>
          <template #editor><location-fields v-model="place" :is-map-shown="false" /></template>
        </ui-property>
      </ui-property-list>
    </div>
    <div class="relative h-96 min-w-0 bg-subtle md:h-auto md:min-h-112">
      <province-map :province-id="client.province" />
      <p v-if="!client.province" class="absolute inset-x-4 top-4 rounded-control bg-surface/90 px-3 py-2 text-center body-two shadow-raised">{{ $t('client.coordinates.noPlace') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useClientStore } from 'client/stores/client';
import { useTerritoryStore } from 'territory/stores/territory';
import { isEmail } from 'auth/composables/normalize-identifier';
import { formatPhone, normalizePhone } from 'global/composables/phone';
import { formatArea, trimmedLocation } from 'territory/composables/location';
import { EMPTY_LOCATION } from 'territory/constants/provinces';
import type { IClientContact, IClientRecord } from 'client/types/client';
import type { ILocation } from 'territory/types/territory';

import UiPhoneInput from 'global/components/ui-phone-input.vue';
import UiProperty from 'global/components/ui-property.vue';
import UiPropertyList from 'global/components/ui-property-list.vue';
import UiSectionHeader from 'global/components/ui-section-header.vue';
import LocationFields from 'territory/components/location-fields.vue';
import IdCardLineIcon from 'global/icons/id-card-line.icon.vue';
import MailLineIcon from 'global/icons/mail-line.icon.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';
import PhoneLineIcon from 'global/icons/phone-line.icon.vue';

const ProvinceMap = defineAsyncComponent(() => import('territory/components/province-map.vue'));

// props
const props = defineProps<{ client: IClientRecord; canEdit: boolean }>();

// stores
const clientStore = useClientStore();
const territoryStore = useTerritoryStore();
const { t } = useI18n();

// variables
const phone = ref('');
const email = ref('');
const place = ref<ILocation>({ ...EMPTY_LOCATION });

// computed
const phoneProblemComputed = computed((): string | null => (normalizePhone(phone.value) ? null : t('global.form.phoneInvalid')));
const emailProblemComputed = computed((): string | null => (!email.value.trim() || isEmail(email.value) ? null : t('global.form.emailInvalid')));
const placeComputed = computed((): string => [props.client.address, props.client.region, props.client.province ? formatArea(territoryStore.findProvince(props.client.province)) : ''].filter(Boolean).join(' · '));

// methods
const save = async (contact: IClientContact): Promise<true | string> => ((await clientStore.updateContact(props.client.id, contact)) ? true : t('client.coordinates.saveError'));

const savePhone = (): Promise<true | string> => save({ phone: normalizePhone(phone.value) ?? '' });

const saveEmail = (): Promise<true | string> => save({ email: email.value.trim() });

const savePlace = (): Promise<true | string> => save({ location: trimmedLocation(place.value) });

// event handlers
const handleStartPlace = (): void => {
  place.value = { province: props.client.province, city: props.client.region, address: props.client.address ?? '' };
};

// lifecycle
onMounted(() => territoryStore.fetchProvinces());
</script>
