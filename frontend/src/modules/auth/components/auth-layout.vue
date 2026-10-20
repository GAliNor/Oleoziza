<template>
  <div class="min-h-dvh bg-white md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    <auth-art class="h-56 md:sticky md:top-0 md:order-2 md:h-dvh" />

    <div class="flex min-h-[calc(100dvh-14rem)] flex-col px-6 pt-20 pb-8 md:min-h-dvh md:px-12 md:py-10 lg:px-20 xl:px-28">
      <header class="rise flex items-center justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <olive-fill-icon class="h-8 w-8 text-primary-olive" />
          <span class="text-lg font-semibold tracking-tight text-accent-brown">{{ $t('global.appName') }}</span>
        </div>
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
import OliveFillIcon from 'global/icons/olive-fill.icon.vue';
</script>
