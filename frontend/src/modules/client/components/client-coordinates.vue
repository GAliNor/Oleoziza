<template>
  <section class="card grid min-w-0 overflow-hidden p-0 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
    <div class="flex min-w-0 flex-col gap-7 p-6 lg:p-8">
      <h3 class="heading-three">{{ $t('client.coordinates.title') }}</h3>
      <dl class="flex flex-col gap-6">
        <div v-for="row in rows" :key="row.label" class="flex min-w-0 items-start gap-4">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-subtle text-fg-brand">
            <component :is="row.icon" class="h-5 w-5" />
          </span>
          <div class="flex min-w-0 flex-col gap-0.5">
            <dt class="body-three">{{ row.label }}</dt>
            <dd class="min-w-0">
              <a v-if="row.href" class="link block truncate font-medium tabular-nums" :href="row.href">{{ row.value }}</a>
              <span v-else class="block truncate font-medium text-fg-display tabular-nums">{{ row.value }}</span>
              <span v-if="row.detail" class="body-two block">{{ row.detail }}</span>
            </dd>
          </div>
        </div>
      </dl>
    </div>
    <div class="h-96 min-w-0 bg-subtle md:h-auto md:min-h-112">
      <province-map :province-id="client.province" />
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, defineAsyncComponent, type Component } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatPhone } from 'global/composables/phone';
import { formatArea } from 'territory/composables/location';
import type { IClientRecord } from 'client/types/client';

import IdCardLineIcon from 'global/icons/id-card-line.icon.vue';
import MailLineIcon from 'global/icons/mail-line.icon.vue';
import MapPinLineIcon from 'global/icons/map-pin-line.icon.vue';
import PhoneLineIcon from 'global/icons/phone-line.icon.vue';

// props
const props = defineProps<{ client: IClientRecord }>();

// stores
const { t } = useI18n();

// variables
const ProvinceMap = defineAsyncComponent(() => import('territory/components/province-map.vue'));

// computed
const rows = computed((): { label: string; value: string; icon: Component; href?: string; detail?: string }[] => {
  const { client } = props;
  return [
    { label: t('client.coordinates.phone'), value: formatPhone(client.phone), icon: PhoneLineIcon, href: `tel:${client.phone}` },
    { label: t('client.coordinates.email'), value: client.email ?? t('client.coordinates.noEmail'), icon: MailLineIcon, href: client.email ? `mailto:${client.email}` : undefined },
    ...(client.identifier ? [{ label: t(`client.identifierKinds.${client.kind}`), value: client.identifier, icon: IdCardLineIcon }] : []),
    { label: t('client.coordinates.address'), value: client.address ?? client.region, icon: MapPinLineIcon, detail: `${client.address ? `${client.region} · ` : ''}${formatArea(client.province)}` },
  ];
});
</script>
