// imports
import type { App } from 'vue';
import { createMapPlugin } from 'map';
import { createMapLibreEngine } from 'map/adapters/maplibre';

// variables
const FRAME_INSET = 28;

// plugin
export const install = (app: App): void => {
  app.use(
    createMapPlugin({
      engine: createMapLibreEngine(),
      isInteractive: false,
      insets: { top: FRAME_INSET, right: FRAME_INSET, bottom: FRAME_INSET, left: FRAME_INSET },
      attribution: '© OpenStreetMap',
    }),
  );
};
