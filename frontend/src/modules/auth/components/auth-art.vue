<template>
  <div class="md:p-3" aria-hidden="true">
    <div
      class="relative h-full overflow-hidden bg-gradient-to-b from-primary-olive-light/70 via-[#EFE9DC]
        to-accent-sand/50 md:rounded-[2rem]"
    >
      <div class="sun absolute top-[14%] right-[14%] h-20 w-20 rounded-full bg-accent-gold/70 blur-[1px] md:h-32 md:w-32" />

      <div
        v-for="(layer, index) in LAYERS"
        :key="layer.className"
        class="hill-layer absolute inset-x-0 bottom-0 flex w-[200%]"
        :class="layer.className"
        :style="{ height: layer.height, animationDuration: `${layer.duration}, 1.4s`, animationDelay: `0s, ${index * 120}ms` }"
      >
        <hill-fill-icon class="h-full w-[calc(50%+2px)] shrink-0" />
        <hill-fill-icon class="-ml-[2px] h-full w-[calc(50%+2px)] shrink-0" />
      </div>

      <div class="absolute inset-0 hidden md:block">
        <div class="glass-card float-card absolute top-[9%] left-[8%] w-[min(21rem,52%)]" style="--rise-delay: 250ms">
          <p class="text-xs font-medium tracking-wide text-neutral-500 uppercase">{{ $t('auth.showcase.oilTitle') }}</p>
          <div class="mt-2 flex items-baseline gap-3">
            <p class="text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
              {{ $n(SHOWCASE_OIL_KG) }} <span class="text-lg font-medium text-neutral-500">kg</span>
            </p>
            <span class="chip bg-success-green/10 text-success-green">
              <arrow-up-line-icon class="h-3 w-3" />
              {{ $t('auth.showcase.growth', { value: $n(SHOWCASE_GROWTH_PERCENT) }) }}
            </span>
          </div>
          <p class="body-two mt-1">{{ $t('auth.showcase.litres', { value: $n(SHOWCASE_OIL_L) }) }}</p>

          <div class="mt-5 flex h-28 items-end gap-3">
            <div v-for="month in SHOWCASE_MONTHLY_OIL" :key="month.monthKey" class="flex flex-1 flex-col items-center gap-1.5">
              <span v-if="month.kg === peakKg" class="text-[11px] font-medium text-neutral-700 tabular-nums">{{ $n(month.kg) }}</span>
              <div
                class="bar w-full rounded-t-[4px]"
                :class="month.kg === peakKg ? 'bg-primary-olive-dark' : 'bg-primary-olive-mid'"
                :style="{ height: `${(month.kg / peakKg) * 64}px` }"
              />
              <span class="text-[11px] text-neutral-500">{{ $t(`auth.showcase.months.${month.monthKey}`) }}</span>
            </div>
          </div>
        </div>

        <div class="absolute top-[42%] right-[6%] flex w-[min(20rem,46%)] flex-col gap-3">
          <div
            v-for="(item, index) in SHOWCASE_ACTIVITY"
            :key="item.titleKey"
            class="glass-card float-card flex items-center gap-3 py-3"
            :style="{ '--rise-delay': `${450 + index * 150}ms`, '--float-delay': `${index * 1.2}s` }"
          >
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-olive-light text-sm
                font-semibold text-primary-olive-dark"
            >
              {{ item.initials }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <p class="truncate text-sm font-semibold text-neutral-900">{{ $t(`auth.showcase.${item.titleKey}`) }}</p>
                <p class="hidden shrink-0 text-[11px] text-neutral-400 xl:block">
                  {{ $t(`auth.showcase.${item.timeKey}`, { minutes: item.minutes }) }}
                </p>
              </div>
              <p class="truncate text-xs text-neutral-500">{{ $t(`auth.showcase.${item.detailKey}`) }}</p>
            </div>
          </div>
        </div>

        <div
          class="glass-card float-card absolute top-[48%] left-[8%] flex items-center gap-3 py-3"
          style="--rise-delay: 750ms; --float-delay: 2s"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-gold/30 text-accent-brown">
            <olive-fill-icon class="h-5 w-5" />
          </span>
          <div>
            <p class="text-xs text-neutral-500">{{ $t('auth.showcase.yieldTitle') }}</p>
            <p class="text-lg font-semibold tracking-tight text-neutral-900 tabular-nums">
              {{ $n(SHOWCASE_YIELD_PERCENT) }} %
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { SHOWCASE_ACTIVITY, SHOWCASE_GROWTH_PERCENT, SHOWCASE_MONTHLY_OIL, SHOWCASE_OIL_KG, SHOWCASE_OIL_L, SHOWCASE_YIELD_PERCENT } from 'auth/constants/showcase';

import ArrowUpLineIcon from 'global/icons/arrow-up-line.icon.vue';
import HillFillIcon from 'global/icons/hill-fill.icon.vue';
import OliveFillIcon from 'global/icons/olive-fill.icon.vue';

// variables
const LAYERS = [
  { className: 'text-primary-olive-mid opacity-70', height: '62%', duration: '120s' },
  { className: 'text-primary-olive', height: '44%', duration: '80s' },
  { className: 'text-primary-olive-dark', height: '28%', duration: '55s' },
];

const peakKg = Math.max(...SHOWCASE_MONTHLY_OIL.map((month) => month.kg));
</script>

<style scoped>
.hill-layer {
  animation-name: drift, hill-rise;
  animation-timing-function: linear, var(--ease-premium);
  animation-iteration-count: infinite, 1;
  animation-fill-mode: none, both;
}

.sun {
  animation: sun-rise 1.8s var(--ease-premium) both;
}

.float-card {
  animation:
    card-rise 0.9s var(--ease-premium) var(--rise-delay, 0ms) both,
    card-float 9s cubic-bezier(0.45, 0, 0.55, 1) calc(var(--rise-delay, 0ms) + var(--float-delay, 0s)) infinite alternate;
  box-shadow:
    0 2px 4px rgb(41 37 36 / 0.04),
    0 16px 28px -8px rgb(41 37 36 / 0.1),
    0 44px 72px -20px rgb(41 37 36 / 0.26),
    inset 0 1px 0 rgb(255 255 255 / 0.9);
  will-change: transform;
}

.bar {
  transform-origin: bottom;
  animation: bar-grow 0.9s var(--ease-premium) both;
  animation-delay: 600ms;
}

@keyframes drift {
  to {
    transform: translateX(-50%);
  }
}

@keyframes hill-rise {
  from {
    translate: 0 30%;
  }
}

@keyframes sun-rise {
  from {
    opacity: 0;
    translate: 0 40px;
  }
}

@keyframes card-rise {
  from {
    opacity: 0;
    translate: 0 24px;
    filter: blur(8px);
  }
}

@keyframes card-float {
  0% {
    transform: perspective(1000px) translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg);
  }
  50% {
    transform: perspective(1000px) translate3d(0, -12px, 0) rotateX(4deg) rotateY(-3deg);
  }
  100% {
    transform: perspective(1000px) translate3d(0, -5px, 0) rotateX(-2deg) rotateY(2deg);
  }
}

@keyframes bar-grow {
  from {
    transform: scaleY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hill-layer,
  .sun,
  .float-card,
  .bar {
    animation: none;
  }
}
</style>
