<template>
  <section class="flex flex-col gap-3">
    <h2 v-if="title" class="heading-four">{{ title }}</h2>
    <div class="grid gap-3 lg:grid-cols-2">
      <configuration-value
        v-for="setting in CONFIGURATION_VALUES"
        :key="setting.key"
        :setting="setting"
        :site-id="configuration.siteId"
        :value="configuration[setting.key]"
        :changes="configuration.history.filter((change) => change.key === setting.key)"
        :is-read-only="isReadOnly"
      />
      <configuration-methods
        :site-id="configuration.siteId"
        :methods="configuration.methods"
        :changes="configuration.history.filter((change) => change.method !== null)"
        :is-read-only="isReadOnly"
      />
    </div>
    <h3 class="heading-five mt-2">{{ $t('configuration.equipmentTitle') }}</h3>
    <div class="grid gap-3 lg:grid-cols-2">
      <configuration-boxes
        :configuration="configuration"
        :changes="configuration.history.filter((change) => change.key === 'boxes')"
        :highest-box-in-use="inUse.highestBox"
        :is-read-only="isReadOnly"
      />
      <configuration-equipment-list
        kind="pressLines"
        :site-id="configuration.siteId"
        :items="configuration.pressLines"
        :in-use-ids="inUse.lineIds"
        :changes="configuration.history.filter((change) => change.key === 'pressLines')"
        :is-read-only="isReadOnly"
      />
      <configuration-equipment-list
        class="lg:col-span-2"
        kind="tanks"
        :site-id="configuration.siteId"
        :items="configuration.tanks"
        :in-use-ids="inUse.tankIds"
        :changes="configuration.history.filter((change) => change.key === 'tanks')"
        :is-read-only="isReadOnly"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { useLotStore } from 'lot/stores/lot';
import { CONFIGURATION_VALUES } from 'configuration/constants/configuration';
import { equipmentInUse, type IEquipmentInUse } from 'configuration/composables/equipment';
import type { IConfiguration } from 'configuration/types/configuration';

import ConfigurationBoxes from 'configuration/components/configuration-boxes.vue';
import ConfigurationEquipmentList from 'configuration/components/configuration-equipment-list.vue';
import ConfigurationMethods from 'configuration/components/configuration-methods.vue';
import ConfigurationValue from 'configuration/components/configuration-value.vue';

// props
const props = defineProps<{ configuration: IConfiguration; title?: string; isReadOnly: boolean }>();

// stores
const lotStore = useLotStore();

// computed
const inUse = computed((): IEquipmentInUse => equipmentInUse(lotStore.lots, props.configuration.siteId));
</script>
