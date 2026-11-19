# Kit

## Business
The development page for inspecting the app's design tokens, shared styles and UI components.

## Exposes
- View: `/kit` → `views/entry.vue`, registered only in development.
- Composables: `readTokens` and `readClasses` read the CSS shown on the page.

## How to reuse
Add a component example to `views/entry.vue` when the shared UI needs a development preview.

## Rules and gotchas
- The view merges its French and Arabic messages when it mounts. The app's eager locale glob excludes Kit so its translations stay out of production.
- The temporary dark-mode preview is removed when the view unmounts.
