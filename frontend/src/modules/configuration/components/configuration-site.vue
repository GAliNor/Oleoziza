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
  </section>
</template>

<script setup lang="ts">
// imports
import { CONFIGURATION_VALUES } from 'configuration/constants/configuration';
import type { IConfiguration } from 'configuration/types/configuration';

import ConfigurationMethods from 'configuration/components/configuration-methods.vue';
import ConfigurationValue from 'configuration/components/configuration-value.vue';

// props
defineProps<{ configuration: IConfiguration; title?: string; isReadOnly: boolean }>();
</script>
