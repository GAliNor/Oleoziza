# map

An abstract map for Vue 3: layers, DOM markers, camera and basemap behind one engine-agnostic API.
It knows nothing about the app that hosts it. Copy the folder to reuse it.

The only engine today is MapLibre GL (`adapters/maplibre`). Callers never see engine types, so
another engine can be added as a new adapter without changing app code.

## Rules

- Imports: `vue` (Vue layer) and `maplibre-gl` (only in `adapters/maplibre/`). Nothing from the
  host app: no `global/`, `~/`, modules, `vue-i18n`, `pinia`, `vue-router` or `import.meta.env`.
  Keys and URLs come in as options.
- Imports inside the folder are relative. The host imports `map` (public entry) and
  `map/adapters/<engine>`, nothing else.
- No Tailwind. `<MapView>` fills its parent; the host positions it.

## Install

```ts
// src/plugins/map.ts
import { createMapPlugin } from 'map';
import { createMapLibreEngine } from 'map/adapters/maplibre';

export const install = (app: App): void => {
  app.use(createMapPlugin({
    engine: createMapLibreEngine(),
    initialView: { center: [45, 24], zoom: 4.5 },
    limits: { maxBounds: [[30, 12], [60, 34]], minZoom: 3 },
    basemap: LIGHT_BASEMAP,
  }));
};
```

`createMapLibreEngine({ labelFont: { url, font } })` takes a glyphs server; without it `label`
symbols are skipped with a warning. MapLibre loads on the first `<MapView>` mount, so importing the
adapter costs nothing until a map shows. A failed load reaches `map.on('error')`.

`isInteractive: false` makes a static figure that never captures page scroll. `attribution` credits
data the host draws itself.

Put one `<MapView />` in the layout. It creates the engine on mount and destroys it on unmount.

## Concepts

- **Layer**: a feature collection plus the **symbols** that draw it (`fill`, `line`, `circle`,
  `icon`, `label`). Inside a layer they draw in that order. Use layers for many or data-driven features.
- **Marker**: a DOM element pinned to a position, for a handful of rich Vue components. It always draws above layers.
- **Basemap**: raster XYZ tiles drawn below every layer. Swapping it keeps the layers.
- **Insets**: screen areas the host's UI covers. Every camera call frames inside what is left.

Every call is safe at any time, even before the map is ready. The controller keeps the desired
state and applies it when the engine is ready, and again after a restart.

## API

```ts
const map = useMap();

map.state.value;            // { isReady, center, zoom, bearing, pitch, bounds }, updated on moveend
await map.whenReady();
const off = map.on('click', ({ lngLat, point }) => {}); // also: ready, moveend, zoomend, error
off();

map.setBasemap({ id: 'light', layers: [{ tiles: 'https://…/tile/{z}/{y}/{x}', attribution: '…' }] });

map.camera.fitBounds([[34, 16], [56, 32]], { maxZoom: 12, duration: 600 });
map.camera.easeTo({ center: [46.7, 24.7], zoom: 10 });  // also flyTo, jumpTo
map.camera.setInsets({ left: 64, right: 420 });          // physical px; the host handles RTL
map.camera.setLimits({ maxBounds: null, minZoom: 3, maxZoom: 18 });
```

### Layers

```ts
const handle = map.layers.add({
  id: 'sites',                         // optional; a duplicate throws
  data: featureCollection,
  zIndex: 10,                          // higher on top; ties keep add order
  symbols: {
    circle: {
      radius: { byProperty: 'count', base: 4, steps: [[10, 6], [100, 9]] },
      color: { byProperty: 'status', match: { open: '#d97706', closed: '#64748b' }, default: '#94a3b8' },
      strokeColor: '#ffffff',
      strokeWidth: 1,
      hover: { radius: 10 },
    },
    label: { textProperty: 'name', size: 12, anchor: 'top', offset: [0, 8] },
  },
  onClick: (feature) => {},            // a click or hover handler makes the layer interactive (pointer cursor)
  onHover: (feature) => {},            // feature, then null on leave; drives the `hover` values
});

handle.setData(next);
handle.setSymbols(symbols);
handle.setVisible(false);
handle.remove();
```

A style value is a constant, a `match` rule or a `steps` rule. `hover` values are constants.

In a component, `useMapLayer(definition)` adds the layer and removes it on unmount, and returns the same handle.

### Markers

```vue
<MapMarker :lng-lat="[46.7, 24.7]" anchor="bottom" :offset="[0, -4]" @click="handleOpen">
  <site-pin :site="site" />
</MapMarker>
```

The slot keeps the full app context (stores, i18n, router). Outside Vue:
`map.markers.add({ lngLat, anchor, offset, isVisible, isInteractive })` returns
`{ element, setLngLat, setVisible, remove }`.

## Types

All public types live in `types/` and are exported from `map`. Adapters implement `IMapEngine`
(`types/engine.ts`). The engine applies what it is told; the controller (`core/controller.ts`)
owns the desired state, creates marker elements, and re-sends basemap and layers on each `onReady`.
