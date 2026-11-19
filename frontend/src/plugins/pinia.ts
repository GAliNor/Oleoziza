import { createPinia } from 'pinia';
import type { App } from 'vue';
import type { PiniaPlugin, Store } from 'pinia';

const pinia = createPinia();
const createdStores = new Set<Store>();

/** Remembers each store as it is created, so sign-out can reset them all. */
export const trackCreatedStores: PiniaPlugin = ({ store }) => {
  createdStores.add(store);
};

pinia.use(trackCreatedStores);

/** Puts every store created so far back to its initial state, except those named, so the next person signing in on this browser sees nothing of the last one. */
export const resetStoresExcept = (keptStoreIds: readonly string[]): void => {
  createdStores.forEach((store) => {
    if (!keptStoreIds.includes(store.$id)) store.$reset();
  });
};

export const install = (app: App): void => {
  app.use(pinia);
};
