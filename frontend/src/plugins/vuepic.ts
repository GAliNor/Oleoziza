// imports
import type { App } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

// methods
export const install = (app: App): void => {
  app.component('VueDatePicker', VueDatePicker);
};

declare module 'vue' {
  interface GlobalComponents {
    VueDatePicker: typeof VueDatePicker;
  }
}
