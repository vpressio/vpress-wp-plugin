# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Server-rendered chart figure** — `vpress_render_figure( $chart_id, $args )` (`includes/class-vpress-figure.php`) prints one escaped `<figure class="vpress-figure …" data-vpress-chart data-vpress-rest>` with a `role="img"` chart slot and a `<figcaption>` (title/subtitle), and enqueues the embed. `vpress_get_public_chart()` hides private charts from visitors who cannot `edit_posts`.
- **Lightweight public embed bundle** — `admin/dist/js/embed.js` + `css/embed.css`, loaded as a script module (`wp_register_script_module`). Mounts every `[data-vpress-chart]` on the page; `window.vpress.mount( el )` mounts content inserted later. No Vuetify, Pinia, vue-router or LogRocket. A non-map chart loads 268 KB gzipped / 844 KB raw (`embed.js` + `chunk-vue.js` + `vpress-chart-container.js` + `chunk-viz.js` + `css/embed.css`); the chart page previously loaded the whole admin bundle, 699 KB gzipped / 2.69 MB raw (`app.js` + `chunk-vendors.js` + `css/app.css`, plugin files only). Map charts additionally fetch `js/chunk-leaflet.js` (43 KB gzipped) and its stylesheet `css/chunk-leaflet.css` (6.5 KB gzipped) on demand; other chart types never download leaflet.
- **Standalone `/chart/{id}` page** — a valid HTML document with the figure and a site/Vpress footer; unknown or private charts get a 404 "Gráfica no disponible".
- Logged-in viewers get a `wp_rest` nonce on the figure (`data-vpress-nonce`), sent as `X-WP-Nonce` by the embed; anonymous markup carries none and stays cacheable.
- Tests: Vitest specs for the embed data flow and mounting; PHPUnit `tests/php/FigureTest.php` (own bootstrap `tests/php/bootstrap-figure.php`); static fixture `admin/tests/fixtures/embed.html`.
- **Chunked CSV import pipeline** (route D′): chunked upload → server-side parse → client-driven ticks. Works on any shared hosting — no `LOAD DATA`, no WP-Cron, no php.ini flags. Progress dialog with row counts; sessions tracked in `wp_vpresscore_imports` with idempotent chunk retries, orphan sweep, and abort. Free tier capped at 20 MB via `vpress_max_upload_bytes` filter (Pro seam: `vpress_import_engine`).
- Server-side encoding detection (UTF-8 BOM / Windows-1252 → UTF-8) — Excel-on-Windows Spanish CSVs import correctly.
- `importPipeline.js` client driver with Vitest coverage (15 tests total).

### Changed
- **`[vpress id="N" align="wide|full|center|none"]` now renders the chart inline** (it printed an empty `<div>`). The legacy `url` attribute is ignored; a non-numeric id renders nothing.
- The chart page no longer loads the admin app bundle, and no longer echoes the raw `?chart=` value into an inline script (reflected XSS); the id is cast to an integer.
- Build: two Vite entries (`app`, `embed`) with vendor chunks split by role (`chunk-vue`, `chunk-vue-app`, `chunk-viz`, `chunk-vuetify`, `chunk-leaflet`, `chunk-vendors`); still exactly one stylesheet per surface (`css/app.css`, `css/embed.css`) plus the lazily loaded `css/chunk-leaflet.css`; the build fails if either entry stylesheet is missing or empty, or if a stray per-chunk stylesheet is emitted that nothing loads. URLs emitted into JS are now relative to the importing chunk, so lazy chunks load from any plugin folder name.
- The chart container's loading state is a plain CSS spinner instead of Vuetify's `<v-progress-circular>`.

### Removed
- The unreferenced 2023 public-embed spike (`public/vpress.js`, `public/components/`, `public/dboxjs/`, `public/vpress/`, `public/helpers/`, `public/utils/`) and the commented-out iframe shortcode.

### Verified
- 15 MB / 260,000 rows: 4 chunks, 52 ticks, 100% progress, exact row count.
- Cap rejection (413) client- and server-side; CP1252 accents (`Nuevo León`, `Suscripción`) decode correctly.

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
