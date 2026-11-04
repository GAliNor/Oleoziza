<template>
  <div class="scene absolute bottom-0" :class="isWide ? 'scene-wide' : 'scene-phone'">
    <img :src="layout.plate.src" :style="placeLayer(layout.plate)" class="layer" alt="" draggable="false" />
    <img
      v-for="crown in layout.crowns"
      :key="crown.src"
      :src="crown.src"
      :style="placeCrown(crown)"
      class="layer crown"
      alt=""
      draggable="false"
    />
    <img :src="layout.olive.src" :style="placeOlive" class="layer olive" alt="" draggable="false" />
    <img :src="layout.stone.src" :style="placeLayer(layout.stone)" class="layer stone" alt="" draggable="false" />
    <img :src="layout.basinFront.src" :style="placeLayer(layout.basinFront)" class="layer" alt="" draggable="false" />

    <svg class="absolute inset-0 h-full w-full" :viewBox="`0 0 ${layout.canvas.width} ${layout.canvas.height}`" fill="none">
      <clipPath id="mill-tank-window">
        <rect :x="layout.tank.x" :y="layout.tank.y" :width="layout.tank.width" :height="layout.tank.height" :rx="layout.tank.radius" />
      </clipPath>
      <g clip-path="url(#mill-tank-window)">
        <rect
          class="tank-level fill-accent-gold"
          :x="layout.tank.x"
          :y="layout.tank.y + layout.tank.height - layout.tank.levelHeight"
          :width="layout.tank.width"
          :height="layout.tank.levelHeight"
        />
      </g>
      <path class="stroke-accent-gold" :d="layout.stream.path" :stroke-width="layout.stream.width" stroke-linecap="round" />
      <path
        class="stream-flow stroke-accent-cream"
        :d="layout.stream.path"
        :stroke-width="layout.stream.width * 0.4"
        stroke-linecap="round"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, onBeforeUnmount, ref } from 'vue';

import { MILL_SCENE_PHONE, MILL_SCENE_WIDE, MILL_SCENE_WIDE_MEDIA_QUERY } from 'auth/constants/mill-scene';
import type { IMillSceneCrown, IMillSceneRect } from 'auth/types/mill-scene';

// variables
const wideMedia = window.matchMedia(MILL_SCENE_WIDE_MEDIA_QUERY);
const isWide = ref(wideMedia.matches);

// computed
const layout = computed(() => (isWide.value ? MILL_SCENE_WIDE : MILL_SCENE_PHONE));

const placeOlive = computed((): Record<string, string> => ({
  ...placeLayer(layout.value.olive),
  '--olive-travel-x': `${(layout.value.olive.travelX / layout.value.olive.width) * 100}%`,
  '--olive-travel-y': `${(layout.value.olive.travelY / layout.value.olive.height) * 100}%`,
}));

// methods
const placeLayer = (rect: IMillSceneRect): Record<string, string> => ({
  left: `${(rect.x / layout.value.canvas.width) * 100}%`,
  top: `${(rect.y / layout.value.canvas.height) * 100}%`,
  width: `${(rect.width / layout.value.canvas.width) * 100}%`,
  height: `${(rect.height / layout.value.canvas.height) * 100}%`,
});

const placeCrown = (crown: IMillSceneCrown): Record<string, string> => ({
  ...placeLayer(crown),
  transformOrigin: `${((crown.pivotX - crown.x) / crown.width) * 100}% ${((crown.pivotY - crown.y) / crown.height) * 100}%`,
  animationDuration: `${crown.swaySeconds}s`,
  animationDelay: `${crown.swayDelaySeconds}s`,
});

// event handlers
const handleWideChange = (event: MediaQueryListEvent): void => {
  isWide.value = event.matches;
};

// lifecycle
wideMedia.addEventListener('change', handleWideChange);

onBeforeUnmount(() => {
  wideMedia.removeEventListener('change', handleWideChange);
});
</script>

<style scoped>
.scene {
  animation: scene-rise 1.4s var(--ease-premium) both;
}

/* Fits the panel's width and stands on its bottom edge; anything cropped at the top is empty sky. */
.scene-wide {
  left: 0;
  width: 100%;
  aspect-ratio: 1224 / 1285;
}

/* Fits the 14rem phone band set by auth-layout, keeping the stone and tank centred without ever leaving a gap at either side. */
.scene-phone {
  --scene-width: calc(14rem * 2172 / 600);
  height: 14rem;
  left: clamp(calc(100% - var(--scene-width)), calc(50% - var(--scene-width) * 0.607), 0px);
  width: var(--scene-width);
}

.layer {
  position: absolute;
  max-width: none;
  user-select: none;
}

.stone {
  animation: stone-turn 24s linear infinite;
  will-change: transform;
}

.crown {
  animation-name: crown-sway;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
  will-change: transform;
}

.olive {
  opacity: 0;
  animation: olive-roll 8s linear infinite;
}

.tank-level {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: tank-level 16s ease-in-out infinite alternate;
}

.stream-flow {
  opacity: 0.55;
  stroke-dasharray: 8 16;
  animation: stream-flow 1.4s linear infinite;
}

@keyframes scene-rise {
  from {
    opacity: 0;
    translate: 0 4%;
  }
}

@keyframes stone-turn {
  to {
    transform: rotate(360deg);
  }
}

@keyframes crown-sway {
  from {
    transform: rotate(-0.5deg);
  }
  to {
    transform: rotate(0.5deg);
  }
}

@keyframes olive-roll {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg);
  }
  3% {
    opacity: 1;
  }
  20% {
    opacity: 1;
  }
  23%,
  100% {
    opacity: 0;
    transform: translate(var(--olive-travel-x), var(--olive-travel-y)) rotate(420deg);
  }
}

@keyframes tank-level {
  from {
    transform: scaleY(0.85);
  }
  to {
    transform: scaleY(1.1);
  }
}

@keyframes stream-flow {
  to {
    stroke-dashoffset: -24;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene,
  .stone,
  .crown,
  .olive,
  .tank-level,
  .stream-flow {
    animation: none;
  }
}
</style>
