import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const fromSrc = (path) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Oleoziza',
        short_name: 'Oleoziza',
        description: "Gestion des moulins à huile d'olive",
        lang: 'fr',
        theme_color: '#73835A',
        background_color: '#FAFAF9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        globIgnores: ['**/loaded-engine-*', '**/maplibre-gl-worker-*'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(loaded-engine|maplibre-gl-worker)-.*\.(js|css)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'map-engine', expiration: { maxEntries: 6 } },
          },
        ],
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  test: {
    env: { TZ: 'Africa/Casablanca' },
  },
  resolve: {
    alias: {
      '~': fromSrc(''),
      map: fromSrc('lib/map'),
      global: fromSrc('modules/global'),
      dashboard: fromSrc('modules/dashboard'),
      auth: fromSrc('modules/auth'),
      site: fromSrc('modules/site'),
      reception: fromSrc('modules/reception'),
      client: fromSrc('modules/client'),
      user: fromSrc('modules/user'),
      task: fromSrc('modules/task'),
      finance: fromSrc('modules/finance'),
      configuration: fromSrc('modules/configuration'),
      lot: fromSrc('modules/lot'),
      kit: fromSrc('modules/kit'),
      territory: fromSrc('modules/territory'),
      activity: fromSrc('modules/activity'),
    },
  },
});
