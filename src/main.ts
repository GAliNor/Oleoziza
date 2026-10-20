// imports
import { createApp, type App as VueApp, type Directive } from 'vue';

import router from '~/router';

import App from '~/App.vue';
import '~/style.css';

// variables
const app = createApp(App);
const plugins = import.meta.glob<{ install: (app: VueApp) => void }>('./plugins/*.ts', { eager: true });
const directives = import.meta.glob<Record<string, Directive>>('./directives/*.ts', { eager: true });

// methods
const kebabCase = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

Object.values(plugins).forEach((plugin) => plugin.install(app));
Object.values(directives).forEach((module) =>
  Object.entries(module).forEach(([name, directive]) => app.directive(kebabCase(name), directive)),
);

app.use(router);
app.mount('#app');
