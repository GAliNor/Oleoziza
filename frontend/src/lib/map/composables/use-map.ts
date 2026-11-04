// imports
import { inject, onScopeDispose } from 'vue';

import { MAP_INTERNAL_KEY, MAP_KEY } from '../plugin';
import type { IMapControllerInternal } from '../core/controller';
import type { ILayerDefinition, ILayerHandle } from '../types/layer';
import type { IUseMap } from '../types/vue';

// composables
/** The map installed by `createMapPlugin`. Throws when the plugin is missing. */
export const useMap = (): IUseMap => {
  const map = inject(MAP_KEY, null);
  if (!map) throw new Error('map: useMap() needs createMapPlugin() installed');
  return map;
};

/** Adds a layer for as long as the calling component (or effect scope) lives. */
export const useMapLayer = (definition: ILayerDefinition): ILayerHandle => {
  const handle = useMap().layers.add(definition);
  onScopeDispose(() => handle.remove());
  return handle;
};

export const useMapInternal = (): IMapControllerInternal => {
  const controller = inject(MAP_INTERNAL_KEY, null);
  if (!controller) throw new Error('map: <MapView> needs createMapPlugin() installed');
  return controller;
};
