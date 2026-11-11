<template>
  <section class="flex flex-col gap-3">
    <div class="flex flex-col gap-1">
      <h2 class="heading-four">{{ title ?? $t('configuration.site.title') }}</h2>
      <p class="body-two">{{ $t('configuration.site.hint') }}</p>
    </div>
    <div class="grid gap-3 lg:grid-cols-2">
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
import { equipmentInUse, type IEquipmentInUse } from 'configuration/composables/equipment';
import type { IConfiguration } from 'configuration/types/configuration';

import ConfigurationBoxes from 'configuration/components/configuration-boxes.vue';
import ConfigurationEquipmentList from 'configuration/components/configuration-equipment-list.vue';
import ConfigurationMethods from 'configuration/components/configuration-methods.vue';

// props
const props = defineProps<{ configuration: IConfiguration; title?: string; isReadOnly: boolean }>();

// stores
const lotStore = useLotStore();

// computed
const inUse = computed((): IEquipmentInUse => equipmentInUse(lotStore.lots, props.configuration.siteId));
</script>
