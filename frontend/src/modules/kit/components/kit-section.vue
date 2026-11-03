<template>
  <section :id="id" class="flex scroll-mt-24 flex-col gap-5 border-t border-default pt-10">
    <header class="flex flex-col gap-1">
      <h2 class="heading-one">{{ title }}</h2>
      <p v-if="description" class="body-two max-w-2xl">{{ description }}</p>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
// props
defineProps<{
  id: string;
  title: string;
  description?: string;
}>();
</script>
