// imports
import { shallowRef, type InjectionKey, type Plugin } from 'vue';

import { createMapController, type IMapControllerInternal } from './core/controller';
import type { IMapPluginOptions } from './types/controller';
import type { MapInjectionKey } from './types/vue';

// keys
export const MAP_KEY: MapInjectionKey = Symbol('map');
export const MAP_INTERNAL_KEY: InjectionKey<IMapControllerInternal> = Symbol('map-internal');

// plugin
/** Installs one map. The host picks the engine: `createMapPlugin({ engine: createMapLibreEngine() })`. */
export const createMapPlugin = (options: IMapPluginOptions): Plugin => ({
  install: (app) => {
    const controller = createMapController(options);
    const state = shallowRef(controller.getState());
    controller.onStateChange((next) => {
      state.value = next;
    });
    app.provide(MAP_INTERNAL_KEY, controller);
    app.provide(MAP_KEY, {
      camera: controller.camera,
      layers: controller.layers,
      markers: controller.markers,
      setBasemap: controller.setBasemap,
      getState: controller.getState,
      whenReady: controller.whenReady,
      on: controller.on,
      state,
    });
  },
});
