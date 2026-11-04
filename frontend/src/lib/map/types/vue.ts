// imports
import type { InjectionKey, ShallowRef } from 'vue';

import type { IMapController } from './controller';
import type { IMapState } from './state';

// vue
/** What `useMap()` returns: the controller plus its state as a read-only ref. */
export interface IUseMap extends IMapController {
  readonly state: Readonly<ShallowRef<IMapState>>;
}

export type MapInjectionKey = InjectionKey<IUseMap>;
