import { defineAsyncComponent, type App } from 'vue';
import type { VueDatePicker } from '@vuepic/vue-datepicker';

const AsyncVueDatePicker = defineAsyncComponent(async () => {
  const [{ VueDatePicker }] = await Promise.all([import('@vuepic/vue-datepicker'), import('@vuepic/vue-datepicker/dist/main.css')]);
  return VueDatePicker;
});

export const install = (app: App): void => {
  app.component('VueDatePicker', AsyncVueDatePicker);
};

declare module 'vue' {
  interface GlobalComponents {
    VueDatePicker: typeof VueDatePicker;
  }
}
