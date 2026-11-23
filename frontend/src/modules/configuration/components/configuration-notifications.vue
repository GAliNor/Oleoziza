<template>
  <ui-section :title="$t('configuration.notifications.title')" :icon="BellLineIcon" :hint="$t('configuration.notifications.hint')">
    <div v-if="!configurationStore.notificationChannels" class="flex flex-col gap-2">
      <div v-for="index in 3" :key="index" class="skeleton h-12 rounded-control" />
    </div>
    <ul v-else class="grid divide-y divide-subtle @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-y-0 rtl:divide-x-reverse">
      <li v-for="item in configurationStore.notificationChannels" :key="item.channel" class="px-2 py-1.5">
        <button
          type="button"
          role="switch"
          class="flex min-h-12 w-full items-center gap-3 rounded-lg text-start disabled:cursor-not-allowed"
          :aria-checked="item.isEnabled"
          :disabled="isLockedComputed || !item.isImplemented"
          @click="handleToggle(item.channel, !item.isEnabled)"
        >
          <ui-switch :is-on="item.isEnabled" :class="{ 'opacity-40': !item.isImplemented }" />
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="label" :class="item.isImplemented ? 'text-fg-display' : 'text-fg-secondary-paragraph'">{{ $t(`configuration.notifications.channels.${item.channel}`) }}</span>
            <span class="body-three">{{ $t(`configuration.notifications.states.${stateOf(item)}`) }}</span>
          </span>
          <span v-if="!item.isImplemented" class="chip shrink-0 bg-subtle text-fg-secondary-paragraph">{{ $t('configuration.notifications.notImplemented') }}</span>
        </button>
      </li>
    </ul>
    <p v-if="configurationStore.notificationChannels && !configurationStore.enabledNotificationChannels.length" class="rounded-control bg-subtle p-3 body-two">
      {{ $t('configuration.notifications.noneEnabled') }}
    </p>
    <p v-if="!canManageComputed" class="px-2 pb-1 body-three">{{ $t('configuration.notifications.readOnly') }}</p>
  </ui-section>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useConfigurationStore } from 'configuration/stores/configuration';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { useOnlineStatus } from 'global/composables/use-online-status';
import type { INotificationChannelSetting, NotificationChannel } from 'configuration/types/configuration';

import UiSection from 'global/components/ui-section.vue';
import UiSwitch from 'global/components/ui-switch.vue';
import BellLineIcon from 'global/icons/bell-line.icon.vue';

// stores
const { t } = useI18n();
const configurationStore = useConfigurationStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();

// variables
const { isOnline } = useOnlineStatus();

// computed
/** A company setting: the Owner, or someone managing the configuration of every Site they hold; the backend checks every Site. */
const canManageComputed = computed((): boolean => {
  const session = sessionStore.session;
  const sites = Object.values(session?.sites ?? {});
  return session?.isOwner === true || (sites.length > 0 && sites.every((permissions) => permissions.includes('configuration.manage')));
});
const isLockedComputed = computed((): boolean => !canManageComputed.value || !isOnline.value || configurationStore.isSaving);

// methods
const stateOf = (item: INotificationChannelSetting): 'unavailable' | 'on' | 'off' => {
  if (!item.isImplemented) return 'unavailable';
  return item.isEnabled ? 'on' : 'off';
};

// event handlers
const handleToggle = async (channel: NotificationChannel, isEnabled: boolean): Promise<void> => {
  const isSaved = await configurationStore.updateNotificationChannel(channel, isEnabled);
  toastStore.push(t(isSaved ? 'configuration.saved' : 'configuration.saveError'), isSaved ? 'success' : 'danger');
};
</script>
