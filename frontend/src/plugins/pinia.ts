// imports
import { createPinia } from 'pinia';
import type { App } from 'vue';

// methods
export const install = (app: App): void => {
  app.use(createPinia());
};
