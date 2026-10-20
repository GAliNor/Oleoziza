<template>
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      class="check-stroke"
      d="M5 12.5l4.5 4.5L19 7.5"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.check-stroke {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: check-draw 0.45s var(--ease-premium) 0.2s forwards;
}

@keyframes check-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .check-stroke {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
