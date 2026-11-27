<template>
  <app-layout>
    <configuration-settings :title="$t('configuration.hub.settings.title')" />
  </app-layout>
</template>

<script setup lang="ts">
// imports
import AppLayout from 'global/components/app-layout.vue';
import ConfigurationSettings from 'configuration/components/configuration-settings.vue';
</script>
