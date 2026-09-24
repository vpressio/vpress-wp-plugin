# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Chunked CSV import pipeline** (route D′): chunked upload → server-side parse → client-driven ticks. Works on any shared hosting — no `LOAD DATA`, no WP-Cron, no php.ini flags. Progress dialog with row counts; sessions tracked in `wp_vpresscore_imports` with idempotent chunk retries, orphan sweep, and abort. Free tier capped at 20 MB via `vpress_max_upload_bytes` filter (Pro seam: `vpress_import_engine`).
- Server-side encoding detection (UTF-8 BOM / Windows-1252 → UTF-8) — Excel-on-Windows Spanish CSVs import correctly.
- `importPipeline.js` client driver with Vitest coverage (15 tests total).
- **Playwright end-to-end smoke suite** (`admin/tests/e2e`, `yarn test:e2e`): logs into WordPress, checks the public REST routes, asserts the public chart page `/chart/1` draws its bars with zero console errors, and drives the editor for real — dataset list → data module → editor, native drag of `estado`/`ventas` onto the X/Y slots, asserts dbox/d3 draws ≥ 5 bar marks under Vue 3, saves through the toolbar, and deletes the chart it created. Optional GitLab `e2e` job runs it when `E2E_BASE_URL` (+ `E2E_USER`/`E2E_PASSWORD`) is set.

### Fixed
- Production bundle resolved fonts/images from a hard-coded `/wp-content/plugins/vpress/admin/dist/` base, so on any install whose folder is not named `vpress` the MDI icon font and every non-inlined image (`btn-beta.png`, `db-gear.svg`, `map.svg`, …) 404'd — icons rendered blank. The Vite build now uses a relative base.
- The dataset list and dataset picker always called the optional Hue connector at `http://localhost:8000` (dev default baked into the bundle), firing a failing cross-origin request at the visitor's machine on every load. The connector is now only used when `VITE_HUE_API_BASE_URL` is set at build time.
- Vite dev server 403'd the MDI icon font inside git worktrees (symlinked `admin/node_modules` sits outside the default `server.fs.allow`).
- Vitest no longer tries to collect the Playwright specs under `tests/e2e`.

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
