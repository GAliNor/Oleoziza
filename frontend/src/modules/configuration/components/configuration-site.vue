<template>
  <div class="@container flex flex-col gap-4">
    <h2 v-if="title" class="heading-two">{{ title }}</h2>
    <ui-section :title="$t('configuration.price.title')" :icon="TagLineIcon" tone="brown" :hint="priceHintComputed">
      <div v-if="season && !prices" class="grid gap-2 p-2 @3xl:grid-cols-3">
        <div v-for="index in 3" :key="index" class="skeleton h-20 rounded-control" />
      </div>
      <div v-else-if="prices" class="grid items-start divide-y divide-subtle @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-y-0 rtl:divide-x-reverse">
        <ui-property-list v-for="value in CONFIGURATION_VALUES" :key="value.key" class="@container min-w-0 p-1 @3xl:h-full">
          <price-property :value-key="value.key" :configuration="prices" :lock-reason="priceLockComputed" />
        </ui-property-list>
      </div>
      <p v-else class="px-2 py-1 body-two">{{ $t('configuration.price.noSeason') }}</p>
    </ui-section>

    <header class="flex flex-col gap-0.5 pt-2">
      <h2 class="heading-three">{{ $t('configuration.site.title') }}</h2>
      <p class="body-two">{{ $t('configuration.site.hint') }}</p>
    </header>

    <div v-if="!settings" class="grid gap-4 @4xl:grid-cols-2">
      <div v-for="index in 4" :key="index" class="skeleton h-40 rounded-card" />
    </div>
    <template v-else>
      <div class="grid items-start gap-4 @4xl:grid-cols-2">
        <div class="flex min-w-0 flex-col gap-4">
          <equipment-rows kind="pressLines" :site-id="siteId" :items="settings.pressLines" :first-free-number="settings.nextPressLineNumber" :in-use-ids="inUseComputed.lineIds" :lock-reason="lockReason" />
          <ui-section :title="$t('configuration.boxes.title')" :icon="BoxLineIcon" tone="terracotta" :hint="$t('configuration.boxes.hint')">
            <ui-property-list>
              <boxes-property :configuration="settings" :highest-box-in-use="inUseComputed.highestBox" :lock-reason="lockReason" />
            </ui-property-list>
          </ui-section>
        </div>
        <div class="flex min-w-0 flex-col gap-4">
          <equipment-rows kind="tanks" :site-id="siteId" :items="settings.tanks" :first-free-number="settings.nextTankNumber" :in-use-ids="inUseComputed.tankIds" :lock-reason="lockReason" />
          <ui-section :title="$t('configuration.methods.title')" :icon="WalletLineIcon" tone="blue" :hint="$t('configuration.methods.hint')">
            <method-rows :site-id="siteId" :methods="settings.methods" :lock-reason="lockReason" />
          </ui-section>
        </div>
      </div>
    </template>
    <p v-if="lockReason && !siteStore.isAllSites" class="body-two" role="status">{{ lockReason }}</p>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useLotStore } from 'lot/stores/lot';
import { useSiteStore } from 'site/stores/site';
import { equipmentInUse, type IEquipmentInUse } from 'configuration/composables/equipment';
import { useConfigurationLock } from 'configuration/composables/use-configuration-lock';
import { CONFIGURATION_VALUES } from 'configuration/constants/configuration';
import type { IConfiguration } from 'configuration/types/configuration';
import type { ISeason } from 'season/types/season';

import UiPropertyList from 'global/components/ui-property-list.vue';
import UiSection from 'global/components/ui-section.vue';
import BoxesProperty from 'configuration/components/boxes-property.vue';
import EquipmentRows from 'configuration/components/equipment-rows.vue';
import MethodRows from 'configuration/components/method-rows.vue';
import PriceProperty from 'configuration/components/price-property.vue';
import BoxLineIcon from 'global/icons/box-line.icon.vue';
import TagLineIcon from 'global/icons/tag-line.icon.vue';
import WalletLineIcon from 'global/icons/wallet-line.icon.vue';

// props
const props = defineProps<{ siteId: string; title?: string; season?: ISeason; prices?: IConfiguration; settings?: IConfiguration }>();

// stores
const { t } = useI18n();
const lotStore = useLotStore();
const siteStore = useSiteStore();
const lockReason = useConfigurationLock(() => props.siteId);

// computed
const priceLockComputed = computed((): string | null => (props.season?.status === 'closed' ? t('configuration.season.readOnlyClosed') : lockReason.value));
const priceHintComputed = computed((): string => (props.season ? t(`configuration.price.hint.${props.season.status}`, { label: props.season.label }) : ''));
const inUseComputed = computed((): IEquipmentInUse => equipmentInUse(lotStore.lots, props.siteId));
</script>
