<template>
  <div class="min-h-dvh bg-surface md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    <auth-art class="h-56 md:sticky md:top-0 md:order-2 md:h-dvh" />

    <div class="flex min-h-[calc(100dvh-14rem)] flex-col px-6 pt-20 pb-8 md:min-h-dvh md:px-12 md:py-10 lg:px-20 xl:px-28">
      <header class="rise flex items-center justify-between gap-4">
        <div>
          <logo-full-fill-icon class="h-10 w-auto text-fg-brand" />
          <span class="sr-only">{{ $t('global.appName') }}</span>
        </div>
        <ui-language-switch class="w-56" />
      </header>

      <main class="flex flex-1 items-start py-10 md:items-center md:py-8">
        <div class="w-full max-w-md">
          <router-view v-slot="{ Component, route }">
            <transition name="fade-step" mode="out-in">
              <component :is="Component" :key="route.path" />
            </transition>
          </router-view>
        </div>
      </main>

      <footer class="rise body-two" style="animation-delay: 400ms">{{ $t('auth.layout.footer') }}</footer>
    </div>

    <app-toast />
  </div>
</template>

<script setup lang="ts">
// imports
import AuthArt from 'auth/components/auth-art.vue';
import AppToast from 'global/components/app-toast.vue';
import UiLanguageSwitch from 'global/components/ui-language-switch.vue';
import LogoFullFillIcon from 'global/icons/logo-full-fill.icon.vue';
</script>
