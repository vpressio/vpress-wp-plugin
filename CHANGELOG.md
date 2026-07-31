# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-07-30

### Changed
- **Admin frontend migrated to Vue 3.5 / Vuetify 3 / Pinia / vue-router 4, built with Vite 7** (was Vue 2.6 / Vuetify 2 / Vuex 3 / vue-router 3 on Vue CLI 4). All 30 SFCs, 2 mixins, and 3 store modules converted; dist contract (`js/app.js`, `js/chunk-vendors.js`, `css/app.css`) preserved.
- WordPress loaders (admin + public) now enqueue the bundle as a single ES-module entry, with a Vite dev-server mode on port 5173 (was webpack on 8080).
- Jest/Cypress scaffolding replaced by Vitest + @vue/test-utils 2 (store unit tests + app smoke mount, 11 tests).
- ESLint moved to flat config (eslint 9 + eslint-plugin-vue 10).

### Removed
- PWA service worker + precache (a self-destructing `service-worker.js` ships at the old path so previously-registered workers unregister themselves).
- `vue-tour` (was already disabled), `logrocket-vuex` (replaced by a custom Pinia plugin), `pug` template in `vpress-chart-container` (converted to HTML).

### Fixed
- Dead CSS `glob()` loop in both PHP loaders (globbed a URL, never matched); replaced by an explicit `css/app.css` enqueue.
